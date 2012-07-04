from WebService import WSOpts

from ConfigService import ConfigServiceClient
import sys

def main():
    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()
    
    parser.add_option("--motd", dest="motd", \
                                 help="Message of the Day to set")

    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ('motd',)):
        parser.print_help()
        sys.exit(-1)

    wsOpts.setLogging(options.debug)

    configServiceClient = ConfigServiceClient(options)

    configServiceClient.client.service.setMessageOfTheDay(options.motd)
# -----------------------------------------------------------------------------
if __name__ == '__main__':
    main()
