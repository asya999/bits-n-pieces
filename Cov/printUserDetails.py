from WebService import WebServiceClient
from WebService import WSOpts
from ConfigService import ConfigServiceClient
import sys
import logging

# create a user account, if local set password to 'coverity'

def main():

    wsOpts = WSOpts()

    parser = wsOpts.get_common_opts()

    parser.add_option("--username",    dest="username",  help="Username")

    (options, args) = parser.parse_args()

    wsOpts.setLogging(options.debug)
    if wsOpts.checkRequiredMissing(options, ('username',)):
        parser.print_help()
        sys.exit(-1)

    configServiceClient = ConfigServiceClient(options);

    print configServiceClient.user_details(options.username)

if __name__ == '__main__':
    main()
