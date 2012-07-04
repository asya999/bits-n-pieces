# given stream or project (or all) get and print out all snapshots
# optionally only list snapshots which have attribute attr match pattern
#

# This script requires suds that provides SOAP bindings for python.
# Download suds from https://fedorahosted.org/suds/
# unpack it and then run:
# python setup.py install
# This may require you to install setuptools (an .exe from python.org)

from WebService import WebServiceClient
from WebService import WSOpts

from ConfigService import ConfigServiceClient
from ConfigService import ConfigServiceClient
from datetime import datetime
import sys
import logging

def main():
    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()

    parser.add_option("--attr",  dest="attr",  help="attribute to filter on");
    parser.add_option("--pattern",  dest="pattern",  help="pattern (glob)");

    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ()):
        parser.print_help()
        sys.exit(-1)

    configServiceClient = ConfigServiceClient(options)

    streamIdDO = configServiceClient.get_streams(options.project,options.stream)
    if len(streamIdDO) == 0:
        logging.error("No matching streams")
        sys.exit(-1)
    else:
        logging.debug("Getting snapshots for "+str(len(streamIdDO))+" streams")
        #streamSnapshots = configServiceClient.get_snapshots(streamIdDO, options.attr, options.pattern)

    #for (streamname, snapshotDOs) in streamSnapshots:
    for stream in streamIdDO:
        print "Stream " + stream.name + ":"
        snapshots = configServiceClient.get_snapshots_by_stream(stream)
        for s in snapshots:
            if len(s) != 1:
                print "Error!!!"
                continue
            print "Stream " + stream.name,
            print '\t',
            print s[0].snapshotId.id,
            print s[0].dateCreated,
            print s[0].analysisVersion,
            #print s[0].enabledCheckers
            print str(len(getattr(s[0],'enabledCheckers',[]))) + " checkers enabled"
            #print getattr(s[0],'target',''),
            #print getattr(s[0],'sourceVersion',''),
# -----------------------------------------------------------------------------
if __name__ == '__main__':
    main()
