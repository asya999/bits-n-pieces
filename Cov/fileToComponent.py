from WebService import WSOpts
from ConfigService import ConfigServiceClient
import sys
import logging

# given a filename or filepath and streams
# return component map and component the files map to

def main():
    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()
    parser.add_option("--filepath",dest="filepath",help="path of file to map")
    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ('stream','filepath')):
        parser.print_help()
        sys.exit(-1)

    if not options.stream or not options.filepath:
        optionParser.error("Must specify both stream and filepath")

    configServiceClient = ConfigServiceClient(options)
    print configServiceClient.fileToComponent(options.filepath, options.stream)

# -----------------------------------------------------------------------------
if __name__ == '__main__':
    main()
