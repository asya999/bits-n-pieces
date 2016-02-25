import pymysql
import pymysql.cursors
import pymongo

query = """SELECT * from coll2 LIMIT 50"""

# true to leave NULLs as explicit nulls in MongoDB
# false to remove NULL value columns from inserted record
insertNullFields=False 

# mySQL connection
mysqldb = pymysql.connect(host='127.0.0.1',db='test',user='test',port=3306,cursorclass=pymysql.cursors.DictCursor)

# MongoDB connection
mconn = pymongo.MongoClient(port=27017)
db = mconn.test  # MongoDB dbname
docs = db.coll4  # MongoDB collection name

# fill in keys/fields you don't want to keep
deletekeys=[]

cur = mysqldb.cursor()
cur.execute(query)

rows = cur.fetchall()    
for line in rows:
   for k,v in line.items():
      if not insertNullFields and v==None: 
          deletekeys.append(k)
          continue
   for k in set(deletekeys):
       del line[k] 
   docs.save(line)
