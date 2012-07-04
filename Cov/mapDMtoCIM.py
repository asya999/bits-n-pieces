from WebService import WSOpts
from DefectService import DefectServiceClient
import sys
import logging

def main():
    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()

    parser.add_option("--cid",  dest="dmcid",  help="Defect Manager CID");
    parser.add_option("--dm-label",  dest="dmlabel",  help="Defect Manager label (used in cov-migrate-db");
    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ('dmcid','dmlabel')):
        parser.print_help()
        sys.exit(-1)

    defectServiceClient = DefectServiceClient(options);

    cid = defectServiceClient.get_cid_from_dm(options.dmcid,options.dmlabel)
    if cid > 0:
        print options.dmcid + " is CID " + str(cid) + " in Integrity Manager"
    else:
        logging.error("Defect not found")
        print "Not found - please double check the DM label"

# -----------------------------------------------------------------------------
if __name__ == '__main__':
    main()
