# This script requires suds that provides SOAP bindings for python.
# Download suds from https://fedorahosted.org/suds/
# unpack it and then run:
# python setup.py install
# This may require you to install setuptools (an .exe from python.org)

from WebService import WSOpts

from ConfigService import ConfigServiceClient
from ConfigService import ConfigServiceClient
from DefectService import DefectServiceClient
import sys
import datetime
import logging

def main():
    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()

    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ('snapshot',)):
        parser.print_help()
        sys.exit(-1)

    configServiceClient = ConfigServiceClient(options)
    defectServiceClient = DefectServiceClient(options);

    snapshotIdDO = configServiceClient.get_snapshot(options.snapshot)
    snapshotInfoDO = configServiceClient.get_snapshot_info(options.snapshot)

    if not snapshotInfoDO:
        logging.warning("No valid snapshot found")
        parser.print_help()
        sys.exit(-1)
    streamname = configServiceClient.get_stream_by_snapshot(options.snapshot)
    streamIdDOs = configServiceClient.get_stream(streamname)
    if not streamIdDOs:
        logging.error("No valid stream for this snapshot found")
        parser.print_help()
        sys.exit(-1)
    if len(streamIdDOs) != 1:
        logging.error("Found more than one stream for this snapshot!!!")
        parser.print_help()
        sys.exit(-1)
    streamIdDO = streamIdDOs[0]

    lastSnapshotIdDO = configServiceClient.get_snapshot_by_date(datetime.datetime.now(), streamIdDO)
    logging.debug("Last snapshot in stream %s is " % (streamIdDO.name))
    logging.debug(lastSnapshotIdDO.id.snapshotId.id)

    mergedDefectDOs = defectServiceClient.get_merged_defects_by_snapshot(snapshotIdDO, streamIdDO)
    logging.debug("Last snapshot in this stream is " + str(lastSnapshotIdDO.id.snapshotId.id))

    totalFetched = mergedDefectDOs.totalNumberOfRecords
    if totalFetched < 1:
        logging.warning("No defects")
        sys.exit(1)
    else:
        logging.debug(str(totalFetched) + " merged defects fetched for snapshot " + str(snapshotIdDO.id) + " " + streamIdDO.name)
        pass

    currentMDDOs = defectServiceClient.get_merged_defects(streamIdDOs, 'all')
    if currentMDDOs.totalNumberOfRecords < 1:
        logging.warning("Something is wrong: no current defects")
        sys.exit(1)
    cids = [md.cid for md in currentMDDOs.mergedDefects]
    logging.debug(len(cids))
    badcids =  ([md.cid for md in mergedDefectDOs.mergedDefects if md.cid not in cids])
    goodcids =  ([md.cid for md in mergedDefectDOs.mergedDefects if md.cid in cids])
    allcids =  [md.cid for md in mergedDefectDOs.mergedDefects]
    logging.debug(len(allcids))
    logging.debug(len(set(cids).difference(set(allcids))))
    logging.debug(len(set(allcids).difference(set(cids))))
    mds =  ([md for md in mergedDefectDOs.mergedDefects if md.cid in cids])
    logging.info(str(len(cids)) + " cids were committed - " + str(len(mds)))
    # things to add
    # get previous snapshot CIDs, compare
    # get next snapshot CIDs, compare
    # give breakdown of CIDs in that snapshot by current status
    print "Number of CIDs committed to stream %s in snapshot %s: %d " % (streamname,options.snapshot,len(cids))
    print " of which:"
    Fixed = [md.cid for md in mds if md.status=='Fixed']
    Dismissed = [md.cid for md in mds if md.status=='Dismissed']
    Triaged = [md.cid for md in mds if md.status=='Triaged']
    New = [md.cid for md in mds if md.status=='New']
    print len(Fixed), " were fixed"
    print len(Dismissed), " are dismissed"
    print len(Triaged), " were triaged but still outstanding"
    print len(New), " are still New and untriaged"

# -----------------------------------------------------------------------------
if __name__ == '__main__':
    main()
