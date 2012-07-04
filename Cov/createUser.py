from WebService import WebServiceClient
from WebService import WSOpts
from ConfigService import ConfigServiceClient
import sys
import logging

# create a user account, if local set password to 'coverity'

def main():

    wsOpts = WSOpts()

    parser = wsOpts.get_common_opts()

    parser.add_option("--username",  dest="username",  help="Username")
    parser.add_option("--first",  dest="first",  help="First name")
    parser.add_option("--last",  dest="last",  help="Last Name")
    parser.add_option("--email", dest="email",  help="Email")
    parser.add_option("--group", dest="group",  help="Local Groups to add to")
    parser.add_option("--role",  dest="role",  help="Role")
    parser.add_option("--ldap",  default=False,  dest="ldap",  action="store_true", help="LDAP or local account, specify for LDAP, default is local")

    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ('username',)):
        parser.print_help()
        sys.exit(-1)

    configServiceClient = ConfigServiceClient(options);

    if options.ldap:
        logging.debug("Creating ldap account " + options.username)
        configServiceClient.create_user(options.username, ldap=True,role=options.role,groups=options.group)
    else:
        logging.debug("Creating local account " + options.username)
        configServiceClient.create_user(options.username,options.first,options.last,options.email,options.group,'coverity',role=options.role)

if __name__ == '__main__':
    main()
