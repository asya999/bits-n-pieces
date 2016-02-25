import psycopg2
import psycopg2.extras
import pymongo
import datetime
import arrow

query = """SELECT * from "DateBins" LIMIT 50"""

# true to leave NULLs as explicit nulls in MongoDB
# false to remove NULL value columns from inserted record
insertNullFields=False 

# PG connection
pgconn = psycopg2.connect("dbname='asya' user='asya'")

# MongoDB connection
mconn = pymongo.MongoClient(port=27017)
db = mconn.test  # MongoDB dbname
docs = db.coll3  # MongoDB collection name


# fill in keys/fields you don't want to keep
deletekeys=[]

cur = psycopg2.extras.RealDictCursor(pgconn)
cur.execute(query)

rows = cur.fetchall()    
for line in rows:
   for k,v in line.items():
      print "=== ", k, " === ", v
      if not insertNullFields and v==None: 
          deletekeys.append(k)
          continue
   for k in set(deletekeys):
       del line[k] 
   print line
   docs.save(line)
