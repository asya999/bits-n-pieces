###
### Author: Asya Kamsky
### Time-stamp: <2015-05-19 00:00:00 >

from multicorn import ForeignDataWrapper
from multicorn.utils import log_to_postgres as log2pg

from pymongo import MongoClient
from pymongo import ASCENDING
from dateutil.parser import parse

from functools import partial

import time

from pymongo.son_manipulator import SONManipulator
import json

dict_traverser = partial(reduce,
                         lambda x, y: x.get(y) if type(x) == dict else x)


def coltype_formatter(coltype):
    if coltype in ('timestamp without time zone', 'timestamp with time zone', 'date'):
        return lambda x: x if hasattr(x, 'isoformat') else parse(x)
    else:
        return None

# unused
class Transform(SONManipulator):

    def __init__(self, columns):
        self.columns=columns;

    def transform_outgoing(self, son, collection):
        for (key, value) in son.items():
          if isinstance(value, dict):
            if "_type" in value and value["_type"] == "custom":
              son[key] = decode_custom(value)
            else: # make sure to recurse into sub-docs
              son[key] = self.transform_outgoing(value, collection)
        return son

class Yamfdw(ForeignDataWrapper):

    def __init__(self, options, columns):
        super(Yamfdw, self).__init__(options, columns)

        self.host_name = options.get('host', 'localhost')
        self.port_nr = int(options.get('port', '27017'))

        self.user = options.get('user')
        self.password = options.get('password')

        self.db_name = options.get('db', 'test')
        self.collection_name = options.get('collection', 'test')

        self.c = MongoClient(host=self.host_name,
                             port=self.port_nr)

        self.auth_db = options.get('auth_db', self.db_name)

        if self.user:
            self.c.userprofile.authenticate(self.user,
                                            self.password,
                                            source=self.auth_db)

        self.db = getattr(self.c, self.db_name)
        self.coll = getattr(self.db, self.collection_name)
        log2pg('db: {} collection: {}'.format(self.db_name, self.collection_name))

        # if we need to validate or transform any fields this is a place to do it
        # we need column definitions for types to validate we're passing back correct types
        # self.db.add_son_manipulator(Transform(columns))

        log2pg('collection cols: {}'.format(columns))
        self.fields = {col: {'formatter': coltype_formatter(coldef.type_name),
                             'path': col.split('.')} for (col, coldef) in columns.items()}

        # if we need to rename fields/columns - this will map old names to new names
        self.fieldmap = options.get('fieldmap')
        if self.fieldmap:
            self.fieldmap = json.loads(self.fieldmap)
        self.pipe = options.get('pipe')
        if self.pipe:
            self.pipe = json.loads(self.pipe)
            log2pg('pipe is {}'.format(self.pipe))
        self.stats = self.db.command("collstats", self.collection_name)
        self.count=self.stats["count"]
        self.pkeys = [ (('_id',), 1), ]
        # maybe only for those that have indexes?
        #fields = {k: True for k in columns}
        #for f in fields:
        #    if f=='_id': continue
        #    # could check for unique indexes and set those to 1
        #    cnt = len(self.coll.distinct(f))
        #    self.pkeys.append( ((f,), self.count/cnt) )

    def build_spec(self, quals):
        Q = {}

        log2pg('Quals passed in are {}'.format(quals))

        comp_mapper = {'>': '$gt',
                       '>=': '$gte',
                       '<=': '$lte',
                       '<>': '$ne',
                       '<' : '$lt',
                       (u'=', True) : '$in',
                       (u'<>', False) : '$nin',
                       '~~': '$regex'
                      }

        for qual in quals:
            val_formatter = self.fields[qual.field_name]['formatter']
            vform = lambda val: val_formatter(val) if val is not None and val_formatter is not None else val
            log2pg('Qual {} field_name: {} operator: {} value: {}'.format(qual, qual.field_name, qual.operator, qual.value))
            if qual.operator == '=':
                Q[qual.field_name] = vform(qual.value)

            elif qual.operator == '~~':
                # need to replace % with real regex for now % to .*
                comp = Q.setdefault(qual.field_name, {})
                comp[comp_mapper[qual.operator]] = vform(qual.value.replace('%','.*'))
                Q[qual.field_name] = comp

            elif qual.operator in comp_mapper:
                comp = Q.setdefault(qual.field_name, {})
                comp[comp_mapper[qual.operator]] = vform(qual.value)
                Q[qual.field_name] = comp

            else:
                log2pg('Qual operator {} not implemented yet: {}'.format(qual.operator, qual))

        return Q

    def get_rel_size(self, quals, columns):
        # this could be a call to explain 
        width = len(columns) * self.stats["avgObjSize"]
        num_rows = self.count
        if quals: 
            if len(quals)==1 and quals[0].field_name=='_id': num_rows=1
            #else: 
               #Q = self.build_spec(quals)
               #num_rows = self.coll.find(Q).count()
        return (num_rows, width)

    def get_path_keys(self):
        return self.pkeys

    def execute(self, quals, columns):

        t0 = time.time()
        ## Only request fields of interest:
        fields = {k: True for k in columns}
        projectFields=fields
        if len(fields)==0:
            fields['_id'] = True
        if '_id' not in fields and len(fields)>0:
            fields['_id'] = False

        Q = self.build_spec(quals)

        log2pg('fields: {}'.format(quals))
        log2pg('spec: {}'.format(Q))
        log2pg('fields: {}'.format(columns))
        log2pg('fields: {}'.format(fields))

        # fieldmap can handle the following transformations:
        # illegal column names for PG translated into new names, maps name to name via name
        # mixed data types stores all non-primary types for inclusion in comparisons
        #if self.fieldmap:
        #    # transform Q to pre-pgnames 
        #    for f in Q:
        #        if f in self.fieldmap:
        #            newQ[self.fieldmap[f]]=Q[f]
        #        else:
        #            newQ[f]=Q[f]

        pipe = []
        needPipe=True
        #needPipe=False
        #if self.pipe:
        #    # instead of pipe.extend(self.pipe)
        #    # iterate over pipe finding "$project" and only keeping the keys in fields
        #    for stage in self.pipe:
        #       if "$project" in stage:
        #          newproj={} # build new $project
        #          isnotone=0
        #          for f in stage["$project"]:
        #              if f in fields: 
        #                 newproj[f] = stage["$project"][f] 
        #                 if newproj[f]!=1: isnotone+=1
        #          if newproj and isnotone>0:
        #              stage["$project"]=newproj
        #              pipe.append(stage)
        #       else:
        #          pipe.append(stage);

         
        #    if len(pipe)>0: needPipe=True

        #if Q:
           # add $match stage with pre-fields at the beginning
           #pipe.insert(0, { "$match" : newQ } )
           # pipe.append( { "$match" : Q } )

        if self.pipe:
            pipe.extend(self.pipe)
            if Q:
                pipe.insert(0, { "$match" : Q } )
            if projectFields>0 and projectFields<len(columns): pipe.append( { "$project" : fields } )
            log2pg('Calling aggregate with {} stage pipe {} '.format(len(pipe),pipe))
            cur = self.coll.aggregate(pipe, cursor={})
        else:
            # need to make these positional so that it won't break in pymongo 3.0
            # if there was field transformation then there cannot be *no* pipeline
            log2pg('Calling find')
            if Q: cur = self.coll.find(spec=Q, fields=fields)
            else: cur = self.coll.find(fields=fields)

            if len(fields)==1 and "_id" in fields:
              cur=cur.hint([("_id",ASCENDING)])

        t1 = time.time()
        log2pg('cur is returned {} with total {} so far'.format(cur,t1-t0))
        for doc in cur:
            yield {col: dict_traverser(self.fields[col]['path'], doc) for col in columns}

        t2 = time.time()
        log2pg('duration of operation in Python is {}'.format(t2-t0))

## Local Variables: ***
## mode:python ***
## coding: utf-8 ***
## End: ***
