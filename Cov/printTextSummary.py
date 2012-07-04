__author__="akamsky"
__date__ ="$Sep 8, 2010 11:56:49 AM$"

from WebService import WSOpts

from DefectService import DefectServiceClient
from ConfigService import ConfigServiceClient
import sys
import logging

def main():
    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()
    parser.add_option("--file",  dest="filename",  help="Limit defects to those in file <filename>")

    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ()):
        parser.print_help()
        sys.exit(-1)

    configServiceClient = ConfigServiceClient(options)
    defectServiceClient = DefectServiceClient(options)

    streamIdDO = configServiceClient.get_streams(options.project,options.stream)
    if not streamIdDO:
        print "Not a valid stream"
        sys.exit(1)


    mergedDefectDOs = defectServiceClient.get_merged_defects(streamIdDO, filename=options.filename)
#Y    mergedDefectDOs = defectServiceClient.get_merged_defects(streamIdDO, statusFilter='New', filename=options.filename)
    total = mergedDefectDOs.totalNumberOfRecords
    if total < 1:
        logging.warning("No new defects")
        sys.exit(1)

    mdDOs = mergedDefectDOs.mergedDefects

    logging.debug("Got "+str(len(mdDOs))+" defects")
    for md in sorted(mdDOs):
        if md.severity in ['Major']:
            logging.debug(md)
            logging.debug(md.checkerName)
            logging.debug(md.checkerSubcategory)
            logging.debug(md.domain)
            cat = configServiceClient.get_checker_properties(md.checkerName, md.checkerSubcategory, md.domain)
            if cat:
                print cat.categoryDescription
                print cat.subcategoryLocalEffect
                print cat.subcategoryLongDescription

            defectServiceClient.print_stream_defect_occurrences(md.cid, streamIdDO[0], options.project)
            c = getattr(md, 'comment',None)
            if c:
                print "Last comment [asya]: ", c
                print ""
                print ""
    # for md in sorted(mdDOs):
    #     if md.severity in ['Moderate']:
    #         defectServiceClient.print_stream_defect_occurrences(md.cid, streamIdDO[0], options.project)

# -----------------------------------------------------------------------------
if __name__ == '__main__':
    main()
