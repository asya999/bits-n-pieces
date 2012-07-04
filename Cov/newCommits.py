from WebService import WSOpts

from ConfigService import ConfigServiceClient
import sys

def main():
    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()
    
    parser.add_option("--check", dest="action", action="store_const", const="check", \
                                 help="Check server commit status")
    parser.add_option("--start", dest="action", action="store_const", const="start", \
                                 help="Start accepting commits if turned off")
    parser.add_option("--stop", dest="action", action="store_const", const="stop", \
                                 help="Stop new commits, wait till they finish")
    parser.add_option("--stop-now", dest="action", action="store_const", const="stop-now", \
                                 help="Stop new commits, don't wait till they finish")

    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ('action',)):
        parser.print_help()
        sys.exit(-1)

    wsOpts.setLogging(options.debug)

    configServiceClient = ConfigServiceClient(options)

    configServiceClient.new_commits(options.action)
# -----------------------------------------------------------------------------
if __name__ == '__main__':
    main()
