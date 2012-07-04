from WebService import WebServiceClient
from WebService import WSOpts
from ConfigService import ConfigServiceClient
import sys
import logging

# create a user account, if local set password to 'coverity'

def main():

    wsOpts = WSOpts()

    parser = wsOpts.get_common_opts()

    parser.add_option("--olduser",    dest="olduser",  help="Username")
    parser.add_option("--newuser",    dest="newuser",  help="Username")

    (options, args) = parser.parse_args()

    if wsOpts.checkRequiredMissing(options, ('newuser','olduser')):
        parser.print_help()
        sys.exit(-1)

    wsOpts.setLogging(options.debug)
    configServiceClient = ConfigServiceClient(options);

    logging.info("Creating new account "+ options.newuser +" from "+ options.olduser)
    configServiceClient.copy_user(options.newuser,options.olduser)

if __name__ == '__main__':
    main()
