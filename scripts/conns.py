import sys
import time
import datetime
import pymongo
from pymongo import MongoClient

lf=open(sys.argv[1]).readlines()
connlines=[line.strip() for line in lf ]
connections=[]
if len(connlines) == 0: sys.exit(-1)
if len(connlines) != len(lf): sys.exit(-1)
conns=MongoClient()['ebay'][sys.argv[2]]

for line in connlines:
    l={}
    dtstr = line[:19]
    try:
       # need to adjust for time zone of the logs to match UTC/Zulu time!
       dt = datetime.datetime.strptime(line[:19]+' 2013', '%a %b %d %H:%M:%S %Y') + datetime.timedelta(hours=3)
    except:
       continue
    words = line[19:].split()
    if line.find('tion accepted ') > -1:
        connid=words[5][1:]
        l['id']=connid
        l['dt']=dt
        l['opened'] = dt
        l['op'] = 'opened'
        l['from']=words[4]
        l['ip']=words[4].split(':')[0]
    else:
        connid=words[0][5:].rstrip(']')
        l['id']=connid
        l['dt']=dt
        if line.find(' end conn') > -1:
            l['closed'] = dt
            l['op'] = 'closed'
            l['from']=words[3]
            l['ip']=words[3].split(':')[0]
        elif line.find(' authenticate') > -1:
            l['auth'] = dt
            l['op'] = 'auth'
            user=line[(line.find('user:')+6):].split('"')[1]
            db=line[(line.find('db:')+4):].split()[0]
            l['user'] = user
            l['db'] = db
        elif line.find('aggregate') > -1:
            l['agg'] = dt
            l['op'] = 'agg'
            l['details'] = line[19:]
        elif line.find('update') > -1:
            l['update'] = dt
            l['op'] = 'update'
            l['details'] = line[19:]
            if line.find("lastUpdated:") > -1:
               uts=int(line[line.find("lastUpdated:")+22:line.find("lastUpdated:")+32])
               l['lastUpdated']=datetime.datetime.fromtimestamp(uts)
        else:
            l['other'] = dt
            l['op'] = 'other'
            l['details'] = line[19:]
    connections.append(l)
    if len(connections) > 100:
       res=conns.insert(connections)
       connections=[]

if len(connections) > 0: res=conns.insert(connections)
