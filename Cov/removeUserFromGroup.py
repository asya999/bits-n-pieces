from WebService import WebServiceClient
from WebService import WSOpts
from ConfigService import ConfigServiceClient
import sys
import logging

def main():

    wsOpts = WSOpts()

    parser = wsOpts.get_common_opts()

    parser.add_option("--username",    dest="username",  help="User to add to group")
    parser.add_option("--group",    dest="group",  help="Group name")

    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ('username','group')):
        parser.print_help()
        sys.exit(-1)

    configServiceClient = ConfigServiceClient(options)

    configServiceClient.remove_user_from_group(options.username, options.group)

if __name__ == '__main__':
    main()
