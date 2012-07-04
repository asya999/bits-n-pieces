__author__="akamsky"
__date__ ="$Sep 8, 2010 11:56:49 AM$"

from WebService import WSOpts

from ConfigService import ConfigServiceClient
from DefectService import DefectServiceClient
import sys
import logging

# script for checking the number of instances of defects (possibly for
# rectifying counts before and after migration
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
    logging.debug(mergedDefectDOs.totalNumberOfRecords)
    total = mergedDefectDOs.totalNumberOfRecords
    if total < 1:
        logging.warning("No defects")
        sys.exit(1)

    mdDOs = mergedDefectDOs.mergedDefects
    got = len(mergedDefectDOs.mergedDefects)

    cidlist = []
    ciddict = {}
    logging.debug("Got "+str(len(mdDOs))+" out of "+str(total)+" defects")
    for md in mdDOs:
        occurrences = defectServiceClient.get_num_stream_defect_occurrences(md.cid, options.stream)
        logging.debug("Cid %d, status %s, %d occurrences" % (md.cid, md.status, occurrences))
        cidlist.append((md.cid, md.classification, max(1,occurrences)))

    totals = sum(x[2] for x in cidlist)
    print "Total occurrences:", totals
    ones = len(set(y[0] for y in cidlist if y[2] == 1))
    moreThanOne = ( (y[0],y[2]) for y in cidlist if y[2] > 1)

    logging.debug( str(ones) + " defects have one occurrence")
    if ones < totals:
        logging.debug("The following " + str(len(set(moreThanOne))) + " defects have more than one occurrence")
        for z in sorted(moreThanOne):
            logging.debug("CID " + str(z[0]) + ": " + str(z[1]))
# -----------------------------------------------------------------------------
if __name__ == '__main__':
    main()
