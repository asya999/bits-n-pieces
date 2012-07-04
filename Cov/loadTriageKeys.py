__author__="akamsky"
__date__ ="$Apr 28, 2012 11:56:49 AM$"

from WebService import WSOpts

from ConfigService import ConfigServiceClient
from DefectService import DefectServiceClient
import sys
import logging
import csv

def cid_for_mkey(mergeKey, mdDOs):
    for md in mdDOs:
        if md['mergeKey'] == mergeKey:
            return md.cid
    print "ERROR"
    return 0

# script for getting merge keys and triage from a stream
def main():
    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()

    (options, args) = parser.parse_args()

    if wsOpts.checkRequiredMissing(options,()):
        parser.print_help()
        sys.exit(-1)

    wsOpts.setLogging(options.debug)

    configServiceClient = ConfigServiceClient(options)
    defectServiceClient = DefectServiceClient(options)

    streamIdDO = configServiceClient.get_streams()

    mergedDefectDOs = defectServiceClient.get_merged_defects(streamIdDO, statusFilter='all')
    total = mergedDefectDOs.totalNumberOfRecords
    logging.debug(total)
    if total < 1:
        logging.warning("No defects")
        sys.exit(1)

    mdDOs = mergedDefectDOs.mergedDefects
    got = len(mergedDefectDOs.mergedDefects)
    mkeys = [m.mergeKey for m in mdDOs]

    Reader = csv.DictReader(open("keysTriage.csv"))
    
    for r in Reader:
        #mergeKey,classification,severity,action,comment
        if r['mergeKey'] in mkeys:
            cid = cid_for_mkey(r['mergeKey'], mdDOs)
            if r['action'] == 'Modeling Required':
                defectServiceClient.update_merged_defect([cid], '*/*',r['classification'],r['severity'],'Analysis Tuning Required',r['comment'])
            else:
                defectServiceClient.update_merged_defect([cid], '*/*',r['classification'],r['severity'],r['action'],r['comment'])


# -----------------------------------------------------------------------------
if __name__ == '__main__':
    main()
