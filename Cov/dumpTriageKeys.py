__author__="akamsky"
__date__ ="$Apr 28, 2012 11:56:49 AM$"

from WebService import WSOpts

from ConfigService import ConfigServiceClient
from DefectService import DefectServiceClient
import sys
import logging
import csv

# script for getting merge keys and triage from a stream
def main():
    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()

    (options, args) = parser.parse_args()

    if wsOpts.checkRequiredMissing(options, ('stream',)):
        parser.print_help()
        sys.exit(-1)

    wsOpts.setLogging(options.debug)

    configServiceClient = ConfigServiceClient(options)
    defectServiceClient = DefectServiceClient(options)

    streamIdDO = configServiceClient.get_stream(options.stream)

    mergedDefectDOs = defectServiceClient.get_merged_defects(streamIdDO, statusFilter='all')
    total = mergedDefectDOs.totalNumberOfRecords
    logging.debug(total)
    if total < 1:
        logging.warning("No defects")
        sys.exit(1)

    mdDOs = mergedDefectDOs.mergedDefects
    got = len(mergedDefectDOs.mergedDefects)

    attrlist = ['mergeKey','classification','severity','action','comment','filePathname','functionDisplayName']
    cidlist = []
    logging.debug("Got "+str(len(mdDOs))+" out of "+str(total)+" defects")
    for md in mdDOs:
        ciddict = {}
        logging.debug("Cid %d, status %s, %s mergeKey" % (md.cid, md.status, md.mergeKey))
        for attr in attrlist:
            ciddict[attr]=getattr(md,attr,None)
            logging.debug(ciddict[attr])
        cidlist.append(ciddict)

    logging.debug("Exporting " + str(len(cidlist)) + " defects")
    Writer = csv.DictWriter(open("keysTriage.csv",'wb'), attrlist)
    Writer.writerow(dict((fn,fn) for fn in attrlist))
    for z in cidlist:
         logging.debug("CID " + str(z['mergeKey']) + ": " + str(z['classification']))
         Writer.writerow(z)

# -----------------------------------------------------------------------------
if __name__ == '__main__':
    main()
