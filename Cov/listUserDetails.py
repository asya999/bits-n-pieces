from WebService import WebServiceClient
from WebService import WSOpts
from ConfigService import ConfigServiceClient
import sys
import logging

def main():

    wsOpts = WSOpts()

    parser = wsOpts.get_common_opts()

    parser.add_option("--username",dest="username",help="User to print details")

    (options, args) = parser.parse_args()

    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ('username',)):
        parser.print_help()
        sys.exit(-1)

    configServiceClient = ConfigServiceClient(options)

    u=configServiceClient.user_details(options.username)
    logging.debug(u)
    for attr in u.__dict__.keys():
        if attr[0:2] == '__':
            continue
        if type(getattr(u, attr, None)) == type([]):
            logging.debug("Skipping attribute " + attr)
            # could add special handling for groups and roles
            continue
        if getattr(u, attr, None):
            print attr," \tis \t", getattr(u, attr)


if __name__ == '__main__':
    main()
