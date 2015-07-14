###
### Author: Asya Kamsky
### Time-stamp: <2015-05-19 00:00:00 >

from multicorn import ForeignDataWrapper
from multicorn.utils import log_to_postgres as log2pg

from pymongo import MongoClient
from pymongo import ASCENDING
from dateutil.parser import parse
from bson.objectid import ObjectId

from functools import partial

import time

from pymongo.son_manipulator import SONManipulator
import json

dict_traverser = partial(reduce,
                         lambda x, y: x.get(y) if type(x) == dict else x)


def coltype_formatter(coltype, otype):
    if coltype in ('timestamp without time zone', 'timestamp with time zone', 'date'):
        return lambda x: x if hasattr(x, 'isoformat') else parse(x)
    elif otype=='ObjectId':
        return lambda x: ObjectId(x)
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

        self.debug = options.get('debug', False)

        # if we need to validate or transform any fields this is a place to do it
        # we need column definitions for types to validate we're passing back correct types
        # self.db.add_son_manipulator(Transform(columns))

        if self.debug: log2pg('collection cols: {}'.format(columns))

        self.stats = self.db.command("collstats", self.collection_name)
        self.count=self.stats["count"]
        if self.debug: log2pg('self.stats: {} '.format(self.stats))

        self.indexes={}
        if self.stats["nindexes"]>1:
            indexdict = self.coll.index_information()
            self.indexes = {idesc['key'][0][0]: idesc.get('unique',False)  for iname, idesc in indexdict.iteritems()}
            if self.debug: log2pg('self.indexes: {} '.format(self.indexes))

        self.fields = {col: {'formatter': coltype_formatter(coldef.type_name, coldef.options.get('type',None)),
                             'options': coldef.options,
                             'path': col.split('.')} for (col, coldef) in columns.items()}

        if self.debug: log2pg('self.fields: {} \n columns.items {}'.format(self.fields,columns.items()))

        self.pipe = options.get('pipe')
        if self.pipe:
            self.pipe = json.loads(self.pipe)
            if self.debug: log2pg('pipe is {}'.format(self.pipe))
        else:
            self.pkeys = [ (('_id',), 1), ]
            for f in self.fields: # if we want to calculate selectivity of each field (once per session)
                if f=='_id': continue
                # could check for unique indexes and set those to 1
                if f in self.indexes and self.indexes.get(f): 
                   self.pkeys.append( ((f,), 1) )
                elif f in self.indexes:
                   self.pkeys.append( ((f,), min((self.count/10),1000) ) )
                else: 
                   self.pkeys.append( ((f,), self.count) )
    
    def build_spec(self, quals, trans=True):
        Q = {}

        comp_mapper = {'>': '$gt',
                       '>=': '$gte',
                       '<=': '$lte',
                       '<>': '$ne',
                       '=': '$eq',
                       '<' : '$lt',
                       (u'=', True) : '$in',
                       (u'<>', False) : '$nin',
                       '~~': '$regex'
                      }

        # TODO '!~~', '~~*', '!~~*', other binary ones that are composable

        for qual in quals:
            val_formatter = self.fields[qual.field_name]['formatter']
            vform = lambda val: val_formatter(val) if val is not None and val_formatter is not None else val
            if self.debug: log2pg('vform {} val_formatter: {} '.format(vform, val_formatter))
            if trans and 'options' in self.fields[qual.field_name] and 'mname' in self.fields[qual.field_name]['options']:
               mongo_field_name=self.fields[qual.field_name]['options']['mname']
            else:
               mongo_field_name=qual.field_name
            if self.debug: log2pg('Qual field_name: {} operator: {} value: {}'.format(mongo_field_name, qual.operator, qual.value))
            if qual.operator in comp_mapper:
               comp = Q.setdefault(mongo_field_name, {})
               if qual.operator == '~~': 
                  comp[comp_mapper[qual.operator]] = vform(qual.value.replace('%','.*'))
               else: 
                  comp[comp_mapper[qual.operator]] = vform(qual.value)
               Q[mongo_field_name] = comp
               if self.debug: log2pg('Qual {} comp {}'.format(qual.operator, qual.value))
            else:
               log2pg('Qual operator {} not implemented yet for value {}'.format(qual.operator, qual.value))

        return Q

    def get_rel_size(self, quals, columns):
        width = len(columns) * min(24, (self.stats["avgObjSize"]/len(self.fields)))
        num_rows = self.count
        if self.pipe: num_rows=self.count*10
        else:
           if quals: 
              fields=[q.field_name for q in quals]
              if '_id' in fields: num_rows=1
              else: 
                  # this part can only be allowed if Q is indexed, otherwise very bad
                  fields=[q.field_name in self.indexes for q in quals]
                  if True in fields:
                      Q = self.build_spec(quals)
                      num_rows = self.coll.find(Q).count()
        return (num_rows, width)

    def get_path_keys(self):
        return getattr(self, 'pkeys', [])

    def execute(self, quals, columns, d={}):

      if self.debug: t0 = time.time()
      ## Only request fields of interest:
      fields = {k: True for k in columns}

      Q = self.build_spec(quals)

      # optimization: if columns include field(s) with equality predicate in query, then we don't have to fetch it
      eqfields = { q.field_name : q.value for q in quals if q.operator == '=' }
      for f in eqfields: fields.pop(f)
      # instead we will inject the exact equality expression into the result set

      if len(fields)==0:    # no fields need to be returned, just get counts

        if not self.pipe:
            docCount = self.coll.find(Q).count()
        else:   # there's a pipe with unwind
            arr=self.pipe[0]['$unwind']    # may not be safe assumption in the future
            countpipe=[]
            if Q: countpipe.append({'$match':Q})
            # hack: everyone just gets array size, 
            # TODO: this only works for one $unwind for now
            countpipe.append({'$project':{'_id':0, 'arrsize': {'$size':arr}}})
            countpipe.append({'$group':{'_id':None,'sum':{'$sum':'$arrsize'}}})
            cur = self.coll.aggregate(countpipe, cursor={})
            for res in cur:
               docCount=res['sum']
               break

        for x in xrange(docCount):
            if eqfields: yield eqfields
            else: yield d

        # we are done
        if self.debug: t1 = time.time()

      else:  # we have one or more fields requested, with or without pipe

        if '_id' not in fields:
            fields['_id'] = False

        if self.debug: log2pg('fields: {}'.format(columns))
        if self.debug: log2pg('fields: {}'.format(fields))

        pipe = []
        projectFields={}
        transkeys = [k for k in self.fields.keys() if 'mname' in self.fields[k].get('options',{})]
        transfields = set(fields.keys()) & set(transkeys)
        if self.debug: log2pg('transfields {} fieldskeys {} transkeys {}'.format(transfields,fields.keys(),transkeys))
        for f in fields:         # there are some fields wanted returned which must be transformed
           if self.debug: log2pg('f {} hasoptions {} self.field[f] {}'.format(f,'options' in self.fields[f],self.fields[f]))
           if 'options' in self.fields[f] and 'mname' in self.fields[f]['options']:
               if self.debug: log2pg('self field {} options {}'.format(f,self.fields[f]['options']['mname']))
               projectFields[f]='$'+self.fields[f]['options']['mname']
           else:
               projectFields[f]=fields[f]

        if self.debug: log2pg('projectFields: {}'.format(projectFields))

        # if there was field transformation we have to use the pipeline
        if self.pipe or transfields:
            if self.pipe: pipe.extend(self.pipe)
            if Q: pipe.insert(0, { "$match" : Q } )
            pipe.append( { "$project" : projectFields } )
            if transfields and Q:
                 # only needed if quals fields are array members, can check that TODO
                 postQ= self.build_spec(quals, False)
                 if Q != postQ: pipe.append( { "$match" : postQ } )

            if self.debug: log2pg('Calling aggregate with {} stage pipe {} '.format(len(pipe),pipe))
            cur = self.coll.aggregate(pipe, cursor={})
        else:
            if self.debug: log2pg('Calling find')
            cur = self.coll.find(Q, fields)

        if self.debug: t1 = time.time()
        if self.debug: docCount=0
        if self.debug: log2pg('cur is returned {} with total {} so far'.format(cur,t1-t0))
        for doc in cur:
            doc.update(eqfields)
            yield {col: dict_traverser(self.fields[col]['path'], doc) for col in columns}
            if self.debug: docCount=docCount+1

      if self.debug: t2 = time.time()
      if self.debug: log2pg('Python rows {} Python_duration {} {} {}ms'.format(docCount,(t1-t0)*1000,(t2-t1)*1000,(t2-t0)*1000))

## Local Variables: ***
## mode:python ***
## coding: utf-8 ***
## End: ***
