# given group name, group roles and whether it's an LDAP or not add a group to CIM
from WebService import WebServiceClient
from WebService import WSOpts
from ConfigService import ConfigServiceClient
import sys

def main():

    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()

    parser.add_option("--group",    dest="group",  help="Group Name")
    parser.add_option("--ldap",  default=False,  dest="ldap",  action="store_true", help="Ldap")
    parser.add_option("--role",  dest="role",  help="Role to add to group")

    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ('group',)):
        parser.print_help()
        sys.exit(-1)

    configServiceClient = ConfigServiceClient(options);

    configServiceClient.create_group(options.group,options.ldap,options.role)

if __name__ == '__main__':
    main()
