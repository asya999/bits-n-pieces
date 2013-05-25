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
        logging.error("Not a valid stream")
        sys.exit(1)


    mergedDefectDOs = defectServiceClient.get_merged_defects(streamIdDO, statusFilter='Triaged', filename=options.filename)
    total = mergedDefectDOs.totalNumberOfRecords
    if total < 1:
        sys.exit(1)

    mdDOs = mergedDefectDOs.mergedDefects

    for md in sorted(mdDOs):
        defectServiceClient.print_stream_defect_brief(md.cid, streamIdDO[0], options.project)

# -----------------------------------------------------------------------------
if __name__ == '__main__':
    main()
