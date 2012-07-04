# This script requires suds that provides SOAP bindings for python.
# Download suds from https://fedorahosted.org/suds/
# unpack it and then run:
# python setup.py install
# This may require you to install setuptools (an .exe from python.org)

from WebService import WSOpts

from DefectService import DefectServiceClient
from ConfigService import ConfigServiceClient
from ConfigService import ConfigServiceClient
import sys
import logging

#
def main():
    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()

    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ('snapshot',)):
        parser.print_help()
        sys.exit(-1)

    configServiceClient = ConfigServiceClient(options)
    defectServiceClient = DefectServiceClient(options)

    snapshotIdDO = configServiceClient.get_snapshot(options.snapshot)
    if not snapshotIdDO:
        logging.error("No valid snapshot found")
        parser.print_help()
        sys.exit(-1)

    streamname = configServiceClient.get_stream_by_snapshot(options.snapshot)
    streamIdDOs = configServiceClient.get_stream(streamname)
    if not streamIdDOs:
        logging.error("No valid stream for this snapshot found")
        sys.exit(-1)
    if len(streamIdDOs) != 1:
        logging.error("Found more than one stream for this snapshot!!!")
        sys.exit(-1)
    streamIdDO = streamIdDOs[0]

    try:
        md = defectServiceClient.get_merged_defects_by_snapshot(snapshotIdDO,streamIdDO)
    except:
        logging.warning("No merged defects for snapshot found")
        sys.exit(-1)
    try:
        cids = [d.cid for d in md.mergedDefects]
    except:
        logging.error("Error getting cids for snapshot")
        sys.exit(-1)

    totalFetched = len(cids)
    if totalFetched < 1:
        print "No defects in snapshot", snapshotIdDO.id.snapshotId.id
        sys.exit(1)
    else:
        print "Fetched "+ str(totalFetched) + " cids in snapshot", options.snapshot

# -----------------------------------------------------------------------------
if __name__ == '__main__':
    main()
