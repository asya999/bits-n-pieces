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
    parser.add_option("--file",  dest="filename",  help="Limit defects to those in file <filename>")

    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ('stream',)):
        parser.print_help()
        sys.exit(-1)

    configServiceClient = ConfigServiceClient(options)
    defectServiceClient = DefectServiceClient(options)

    streamIdDO = configServiceClient.get_stream(options.stream)

    mergedDefectDOs = defectServiceClient.get_merged_defects(streamIdDO, statusFilter='New', filename=options.filename)
    total = mergedDefectDOs.totalNumberOfRecords
    if total < 1:
        logging.warning("No new defects")
        sys.exit(1)

    mdDOs = mergedDefectDOs.mergedDefects

    cidlist = []
    for md in mdDOs:
        occurrences = defectServiceClient.get_stream_defect_occurrences(md.cid, options.stream)
        logging.debug("CID %d, %s" % (md.cid, repr(md)))
        cidlist.append((md.cid, max(1,len(occurrences))))

    totals = sum(x[1] for x in cidlist)
    print "Total occurrences:", totals
    ones = len(set(y[0] for y in cidlist if y[1] == 1))
    moreThanOne = ( (y[0],y[1]) for y in cidlist if y[1] > 1)

    print ones, " defects have one occurrence"
    if ones < totals:
        print "The following defects have more than one occurrence"
        for z in sorted(moreThanOne):
            print "CID ", z[0], ": ", z[1]
# -----------------------------------------------------------------------------
if __name__ == '__main__':
    main()
