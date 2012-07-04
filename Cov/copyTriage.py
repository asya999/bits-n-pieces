# copyTriage.py
#
# Copy triage information from all or some defects in stream1 to stream2.
#
# author: Asya Kamsky (asya@coverity.com)
# general approach: query source stream for all or all untriaged CIDs
# This script requires suds that provides SOAP bindings for python.
#
# Download suds from https://fedorahosted.org/suds/
#
# unpack it and then run:
# python setup.py install
#
# This may require you to install setuptools (an .exe from python.org)

from WebService import WSOpts
from DefectService import DefectServiceClient
from ConfigService import ConfigServiceClient
import logging
import sys

def main():

    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()

    parser.add_option("--from_stream",  dest="fromStream",  help="get states from from this stream")
    parser.add_option("--to_stream",    dest="toStream",  help="update triage in this stream\n\t\tSpecial stream name Every_stream reserved for all stream update")

    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ('fromStream','toStream')):
        parser.print_help()
        sys.exit(-1)

    configServiceClient = ConfigServiceClient(options)
    streamFromDO = configServiceClient.get_stream(options.fromStream)
    streamToDO = configServiceClient.get_stream(options.toStream)

    defectServiceClient = DefectServiceClient(options)

    defects_done = 0
    batch = 200
    matching_cids = []
    # Fetch the set of defects to copy triage from
    mergedDefectDOs = defectServiceClient.get_merged_defects(streamFromDO, statusFilter='all')
    TotalCids = mergedDefectDOs.totalNumberOfRecords
    if TotalCids < 0:
        logging.error("Error!  Failed to get Merged Defects to copy from!")
        sys.exit(-1)
    matching_cids = [d.cid for d in mergedDefectDOs.mergedDefects]
    if TotalCids != len(matching_cids):
        logging.error("Should not happen: length of matching_cids isn't same as TotalCids")
    while defects_done < TotalCids:
        logging.debug("Got %d of %d total MDs" % (defects_done, TotalCids))
        defectServiceClient.copy_triage(matching_cids[defects_done::batch], streamFromDO, streamToDO)
        defects_done += batch
        logging.debug("Got %d of %d total MDs" % (min(defects_done,TotalCids), TotalCids))
    logging.info("Copied triage for %d defects" % (TotalCids))

#-----------------------------------------------------------------------------------
if __name__ == '__main__':
    main()
