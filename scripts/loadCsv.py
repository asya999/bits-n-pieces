import csv
import pymongo
import sys
import json
import datetime
import arrow

# true to leave NULLs as explicit nulls in MongoDB
# false to remove NULL value columns from inserted record
insertNullFields=False 

conn = pymongo.MongoClient(port=27017)
db = conn.test  # dbname
docs = db.coll  # collection name

datafile = sys.argv[1:][0]
nReader = csv.DictReader(open(datafile, "r"), delimiter=',')

# fill in keys/fields you don't want to keep
deletekeys=[]

for line in nReader:
   for k,v in line.items():
      # print "=== ", k, " === ", v
      if not insertNullFields and v=='': 
          deletekeys.append(k)
          continue
      # try date type conversion(s)
      try:
          gdate=datetime.datetime.strptime(v,"%Y-%m-%d")
          # print k, " is a date", gdate
          line[k]=gdate
          continue
      except:
          # print "not date"
          pass
      try:
          gdate=datetime.datetime.strptime(v,"%Y-%m-%dT%H:%M:%S")
          # print k, " is a datetime", gdate
          line[k]=gdate
          continue
      except:
          # print "not datetime"
          pass
      i=v
      if isinstance(v, basestring) and v.find(".")>0:
          try:
              i=float(v)
              # print k, " is now float", i
              line[k]=i
              continue
          except:
              # print "not any float"
              pass
      else:
          try:
              i=int(v)
              # print k, " is now int", i
              line[k]=i
              continue
          except:
              # print "not any int"
              pass
      # this will pretty much turn any string or number into a date if it possibly can
      # could move this above "int" check and accept any int that converts into a date 
      # in this century or this decade as being an actual date
      try:
          gdate=arrow.get(v).datetime
          # print k, " is arrow date", gdate
          line[k]=gdate
          continue
      except:
          # print "not date"
          pass
   # print "going to delete ", set(deletekeys)
   for k in set(deletekeys):
       del line[k]
   # print '******************'
   # print line
   docs.save(line)
