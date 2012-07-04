# This script requires suds that provides SOAP bindings for python.
#
# Download suds from https://fedorahosted.org/suds/
#
# unpack it and then run:
# python setup.py install
#
# This may require you to install setuptools (an .exe from python.org)

from WebService import WSOpts
from ConfigService import ConfigServiceClient
import sys
import logging

# check all components to see if Users is first, if not warn (maybe should flip all(?))
# possible enhancement is take option and fix order

def main():
    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()

    # parser.add_option("--reverse",  action="store_true", dest="reverse", default=False, help="Reverse order of groups if Users is on the wrong end");

    (options, args) = parser.parse_args()

    if not options.password:
        parser.print_help()
        sys.exit(-1)

    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ()):
        parser.print_help()
        sys.exit(-1)

    configServiceClient = ConfigServiceClient(options)

    componentMaps = configServiceClient.get_component_maps()
    if len(componentMaps) == 0:
        # if they are no maps, something is wrong where is Default?
        logging.error( "Where is default component map?")
        sys.exit(-1)

    for cm in componentMaps:
        print ("Checking component map" + cm.componentMapId.name + ":")
        print ( str(len(cm.components)) + " components found")
        for c in cm.components:
            name = c.componentId.name
            print ("Component " + name)
            numGroups = len(getattr(c,'groupPermissions',[]))
            if numGroups == 0:
                logging.error("    ERROR: component ",name," has no group permissions!!!")
            else:
                gPerms = c.groupPermissions
                gPermsNum = len(gPerms)
                for g in gPerms:
                    permission= g.groupRole
                    print (g.groupId.name + "  \t/\t" + permission)

# -----------------------------------------------------------------------------
if __name__ == '__main__':
    main()
