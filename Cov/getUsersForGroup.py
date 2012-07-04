from WebService import WebServiceClient
from WebService import WSOpts
from ConfigService import ConfigServiceClient
import sys

def main():

    wsOpts = WSOpts()

    parser = wsOpts.get_common_opts()

    parser.add_option("--group",    dest="group",  help="Group name")

    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ('group',)):
        parser.print_help()
        sys.exit(-1)

    configServiceClient = ConfigServiceClient(options);

    print configServiceClient.get_users_for_group(options.group)

if __name__ == '__main__':
    main()
