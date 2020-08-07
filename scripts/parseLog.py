#!/usr/bin/python
# 
# parse mongod log file into a db/collection
#

import sys
import time
import datetime
import pymongo
from pymongo import MongoClient
from optparse import OptionParser

def main():

    # get opts

    parser = OptionParser()
    parser.add_option("-f", "--file", dest="filename",help="log filename",metavar="FILENAME")
    parser.add_option("-H", "--hostport", dest="host",help="host and port if not localhost:27017",metavar="HOSTPORT")
    parser.add_option("-d", "--database", dest="database",help="database",metavar="DATABASE")
    parser.add_option("-c", "--collection", dest="collection",help="collection",metavar="COLLECTION")
    parser.add_option("-t", "--timezone", dest="timezone",help="number of hours to adjust (optional)",metavar="TIMEHOURS")
    parser.add_option("-s", "--server", dest="server",help="server name log is from (optional)",metavar="SERVER")

    (options, args) = parser.parse_args()

    # open file
    lf=open(options.filename).readlines()
    loglines=[line.strip() for line in lf ]
    if len(loglines) == 0: 
         print "ERROR: Empty file??? Filename: ", options.filename
         sys.exit(-1)
    if len(loglines) != len(lf): 
         print "ERROR: Different number of lines parsed than in the file!", len(loglines), len(lf)
         sys.exit(-1)

    if options.host:
        host = options.host
    else:
        host = 'localhost:27017'
    if options.server:
        server = options.server
    else:
        server = options.filename
    # open DB connection
    coll=MongoClient(host)[options.database][options.collection]
    try:
        parseLogs(loglines, coll, server, options)
    except Exception, err:
        print "Error parsing log " + str(err)
        return -1

    print "Successfully parsed log"
    return 0

def parseLogs(loglines, coll, server, options):
    # parse lines
    lines=[]
    print len(loglines), " log lines"
    for line in loglines:
        l={}
        dtstr = line[:23]
        try:
           # need to adjust for time zone of the logs to match UTC/Zulu time!
           adjhours=0
           if options.timezone: adjhours=int(options.timezone)
           # TZ = hours before or after UTC time, to adjust, add
           # 2017-10-26T16:00:00.002
           dt = datetime.datetime.strptime(dtstr, '%Y-%m-%dT%H:%M:%S.%f') + datetime.timedelta(hours=adjhours)
        except Exception, err:
           # this should preserve/reuse the previous dt
           print "exception in adjusthours try", str(err), dtstr
           sys.exit(1)
        words = line.split()[4:]
        l['server']=server
        l['dt'] = dt
        if line.find('tion accepted ') > -1:
            connid=words[5][1:]
            l['id']=connid
            l['dt']=dt
            l['op'] = 'opened'
            l['from']=words[4]
            l['ip']=words[4].split(':')[0]
        elif line.find(' [conn') > -1:
            connid=words[0][5:].rstrip(']')
            l['id']=connid
            l['dt']=dt
            if line.find(' end conn') > -1:
                l['op'] = 'closed'
                l['from']=words[3]
                l['ip']=words[3].split(':')[0]
            elif line.find(' authenticate') > -1:
                l['op'] = 'auth'
                user=line[(line.find('user:')+6):].split('"')[1]
                db=line[(line.find('db:')+4):].split()[0]
                l['user'] = user
                l['db'] = db
            elif line.find('aggregate') > -1:
                l['op'] = 'agg'
                l['details'] = line[23:]
            elif line.find('update') > -1:
                if line.find("findandmodify:") > -1:
                   l['op'] = 'findandmodify'
                   l['ns'] = line.split()[6][:line.find('$cmd')] + line.split()[10]
                   uts=int(line[line.find("lastUpdated:")+22:line.find("lastUpdated:")+32])
                   l['lastUpdated']=datetime.datetime.fromtimestamp(uts)
                else:
                   l['op'] = 'update'
                   l['ns'] = line.split()[6]
                   l['q'] = line[line.find(' query: ')+8:line.find(' update:')]
                   l['u'] = line[line.find(' update: ')+9:line.find(' update:')]
                   l['details'] = line.split()[7:]
            elif line.find('update') > -1:
                l['op'] = 'update'
                l['details'] = line[23:]
            else:
                l['op'] = 'other'
                l['details'] = line[23:]
        else:
            # this is a system thread
            threadName = line[ line.find(' [')+2:line.find('] ')]
            l['op'] = threadName
        l[l['op']] = dt
        lines.append(l)
        if len(lines) > 100:
           res=coll.insert(lines)
           print "Inserting 100 lines into ", repr(coll)
           lines=[]
    
    if len(lines) > 0: res=coll.insert(lines)
    
# -----------------------------------------------------------------------------
if __name__ == '__main__':
    main()
