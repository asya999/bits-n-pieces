from WebService import WSOpts

from ConfigService import ConfigServiceClient
import sys

def main():
    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()

    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ()):
        parser.print_help()
        sys.exit(-1)

    wsOpts.setLogging(options.debug)

    configServiceClient = ConfigServiceClient(options)

    configServiceClient.print_system_config()
# -----------------------------------------------------------------------------
if __name__ == '__main__':
    main()
