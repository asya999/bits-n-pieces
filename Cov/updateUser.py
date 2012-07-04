from WebService import WebServiceClient
from WebService import WSOpts
from ConfigService import ConfigServiceClient

import sys
import logging

def main():

    wsOpts = WSOpts()

    parser = wsOpts.get_common_opts()

    parser.add_option("--username",    dest="username",  help="User to add to group")
    parser.add_option("--email",    dest="email",  help="New email to replace existing")
    parser.add_option("--role",    dest="role",  help="New role to add")

    (options, args) = parser.parse_args()

    if wsOpts.checkRequiredMissing(options, ('username','email'),('username','role')):
        logging.error("Must specify username and either new email or new role")
        sys.exit(-1)

    configServiceClient = ConfigServiceClient(options)

    configServiceClient.update_user(options.username, options.email,options.role)

if __name__ == '__main__':
    main()
