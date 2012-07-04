from WebService import WebServiceClient
from WebService import WSOpts
from ConfigService import ConfigServiceClient
import sys
import logging

def main():

    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()

    parser.add_option("--group",    dest="group",  help="Group Name")
    parser.add_option("--newname",    dest="newname",  help="New name")

    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ('group','newname')):
        parser.print_help()
        sys.exit(-1)

    configServiceClient = ConfigServiceClient(options);

    configServiceClient.rename_group(options.group,options.newname)

if __name__ == '__main__':
    main()
