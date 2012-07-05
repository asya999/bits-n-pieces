# author Asya Kamsky (asya@kamsky.org)
# date Jan 31, 2012
# updated for 6.0 / v5 July 4th, 2012
# This script requires suds that provides SOAP bindings for python.
# Download suds from https://fedorahosted.org/suds/
# unpack it and then run:
# python setup.py install
# This may require you to install setuptools (an .exe from python.org)

from suds import *
from suds import null
from suds.client import Client
from suds.wsse import *
from optparse import OptionParser
import logging
import logging.config
import logging.handlers

# -----------------------------------------------------------------------------
# Base class for all the web service clients
class WebServiceClient:
    def __init__(self, webservice_type, host, port, user, password, secure=False, version='v5'):
        if secure==True:
            self.url = 'https://' + host + ':' + port
        else:
            self.url = 'http://' + host + ':' + port
        if webservice_type == 'administration':
            if version == 'v4':
                logging.error("Administration Service has been merged with Configuration Service in v4")
                return
            else:
                self.wsdlFile = self.url + '/ws/'+version+'/administrationservice?wsdl'
        elif webservice_type == 'configuration':
            self.wsdlFile = self.url + '/ws/'+version+'/configurationservice?wsdl'
        elif webservice_type == 'defect':
            self.wsdlFile = self.url + '/ws/'+version+'/defectservice?wsdl'

        self.client = Client(self.wsdlFile)
        self.security = Security()
        self.token = UsernameToken(user, password)
        self.security.tokens.append(self.token)
        self.client.set_options(wsse=self.security)

        self.pageSpecDO = self.client.factory.create('pageSpecDataObj')
        if webservice_type == 'defect':
            self.pageSpecDO.pageSize = 2500
        else:
            self.pageSpecDO.pageSize = 500

        self.pageSpecDO.sortAscending = False
        self.pageSpecDO.startIndex = 0
        self.version = version

    def getwsdl(self):
        logging.info(self.client)

    def get_pstreams(self, proj):
        return getattr(proj,'streams',[])+getattr(proj,'streamLinks',[])

    def create_url(self, cid=None, project_id=None, streamId=None, defectInstance=None, fileInstance=None):
        """ given CID number and Project ID, return a URL to that defect
        """
        if not cid:
            return self.url
        if not project_id and cid:
            logging.error("CID must have project_id with it!")
            return ''
        url = self.url + "/sourcebrowser.htm?projectId=" + str(project_id) + "#mergedDefectId=" + str(cid)

        if streamId:
            url = url+"&streamDefectId="+str(streamId)
            if defectInstance:
                url = url+"&defectInstanceId="+str(defectInstance)
                if fileInstance:
                    url = url+"&fileInstanceId="+str(fileInstance)

        logging.debug('The URL is '+url)
        return url

class NullHandler(logging.Handler):
    def emit(self, record):
        pass

# common options to all the scripts
class WSOpts:
    def __init__(self):
        self.parser = OptionParser()
        # default logging level, logging.WARNING
        self.level = logging.INFO
        self.serverRequiredList = ('host','port','user','password')

    def checkRequiredMissing(self, opt, rList, oList=None):
        """
           opt is the parsed options struct, rList is the required
           list of expected parameters. if oList exists it can optionally
           be specified instead of rList

           Server params are always required and come from serverRequiredList.
           The rest come from rList
        """
        missing = False
        missP = False
        missO = False
        for p in rList:
            if not getattr(opt, p, None):
                if not oList: logging.error("Missing required option --" + p)
                missP = True
        if oList:
            for p in oList:
                if not getattr(opt, p, None):
                    missO = True
        if missP and not oList:
            missing = True
        if missP and missO:
            missing = True

        for s in self.serverRequiredList:
            if not getattr(opt, s, None):
                logging.error("Missing required server option --" + p)
                missing = True
        if missing:
            logging.error("Some required options are missing\n")
        return missing

    def setLogging(self, debug):
        """
           Set logging level for WS script.   If debug is not None or False
           the logging will be set to 'debug' level.
           suds logging is handled separately, to a file
        """
        if debug:
            self.level = logging.DEBUG

        # if you don't want suds.client to log anywhere at all,
        # uncomment next line, and comment out the line after it
        #    h = NullHandler()
        h = logging.FileHandler("./suds.log","w",delay=False)
        # do not propagate suds.* logging to root log hander
        logging.getLogger("suds").propagate=False
        # so it will only go into the log file and not to the console
        logging.getLogger("suds").addHandler(h)
        logging.getLogger("suds").setLevel(logging.ERROR)
        logging.getLogger('').setLevel(self.level)

        logging.debug("Logging level set to ")
        logging.debug(logging.getLogger('').getEffectiveLevel())

    def response_file(self, option, opt_str, value, parser):
        rfile = file(value,'r').read().split()
        parser.rargs.extend(rfile)

    def get_common_opts(self):

        self.parser.add_option("--response-file","-r", action="callback", callback=self.response_file, type="string",help="Command arguments file")

        self.parser.set_defaults(host="localhost")
        self.parser.set_defaults(user="admin")
        self.parser.set_defaults(port="8080")
        if os.getenv("COVERITY_PASSPHRASE"):
            self.parser.set_defaults(password=os.getenv("COVERITY_PASSPHRASE"))
        else:
            self.parser.set_defaults(password="coverity")

        self.parser.add_option("--host","-H", dest="host", help="hostname or IP for CIM");
        self.parser.add_option("--port","-p",  dest="port", help="http or https port for CIM");
        self.parser.add_option("--secure","-s",  dest="secure",  default=False, action="store_true", help="specify to use https/SSL connection");
        self.parser.add_option("--debug","-d",  dest="debug",  default=False, action="store_true", help="Increase logging level to DEBUG");
        self.parser.add_option("--user","-u",  dest="user", help="CIM username");
        self.parser.add_option("--password","-w",  dest="password",  help="CIM password");
        self.parser.add_option("--project","-P",  dest="project",  help="Project name");
        self.parser.add_option("--stream","-S",  dest="stream",  help="Stream name");
        self.parser.add_option("--snapshot",  type=int, dest="snapshot",  help="Snapshot name or number");

        return self.parser
