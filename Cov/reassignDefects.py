__author__="akamsky"
__date__ ="$Jan 31, 2012 10:16:12 AM$"

from WebService import WSOpts

from ConfigService import ConfigServiceClient
from DefectService import DefectServiceClient
import sys
import logging

# script to assign all defects from user1 to user2
# works with user1 being disabled user which can't be done in the UI
def main():
    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()
    parser.add_option("--user1", dest="user1", help="Owner of defects")
    parser.add_option("--user2", dest="user2", help="New owner to assign defects to")

    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ('user1','user2')):
        parser.print_help()
        sys.exit(-1)

    if options.user1 == options.user2:
        logging.warning("Users are the same.  Nothing to do")
        sys.exit(0)

    configServiceClient = ConfigServiceClient(options)
    defectServiceClient = DefectServiceClient(options)

    streamIdDO = configServiceClient.get_stream(options.stream)

    mergedDefectDOs = defectServiceClient.get_merged_defects(streamIdDO, users=options.user1,statusFilter='all')
    logging.debug(mergedDefectDOs.totalNumberOfRecords)
    total = mergedDefectDOs.totalNumberOfRecords
    if total < 1:
        logging.warning("No defects returned")
        sys.exit(1)

    mdDOs = mergedDefectDOs.mergedDefects
    got = len(mergedDefectDOs.mergedDefects)

    logging.debug("Length of list %d %d" % (got, total))
    cidlist = []
    for md in mdDOs:
        cidlist.append(md.cid)

    scope = defectServiceClient.set_scope(options.project, options.stream)
    logging.debug("Setting %d defects to owner=%s in scope %s" % (len(cidlist), options.user2, scope))
    defectServiceClient.update_merged_defect(cidlist, scope, owner=options.user2)


# -----------------------------------------------------------------------------
if __name__ == '__main__':
    main()
