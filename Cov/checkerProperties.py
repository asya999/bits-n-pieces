from xml.dom import minidom

from WebService import WebServiceClient
from WebService import WSOpts

from ConfigService import ConfigServiceClient
import sys

# shows how to call ConfigService checker category/impact/etc related methods
def main():
    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()

    (options, args) = parser.parse_args()

    if wsOpts.checkRequiredMissing(options, ()):
        parser.print_help()
        sys.exit(-1)

    wsOpts.setLogging(options.debug)

    configServiceClient = ConfigServiceClient(options)

    highs = configServiceClient.get_checkers_by_impact('High')
    #domains = ['STATIC_C', 'STATIC_JAVA', 'STATIC_CS']
    domains = ['STATIC_C']
    for d in domains:
      dh = [h for h in highs if h.domain==d]
      for c in sorted(dh):
        print c.checkerName
    meds = configServiceClient.get_checkers_by_impact('Medium')
    for d in domains:
      print '\tMedium impact for domain ',d
      dh = [h for h in meds if h.domain==d]
      for c in sorted(dh):
        print c.checkerName

    sys.exit(0)
    print "----------------------******--------------------"
    print "----------------------******--------------------"
    print "How to get all Low Impact Checkers"
    lows = configServiceClient.get_checkers_by_impact('Low')
    for d in domains:
      print '\tLow impact for domain ',d
      dh = [h for h in lows if h.domain==d]
      for c in sorted(dh):
        print "\t\t", c.checkerName, c.subcategory

if __name__ == '__main__':
    main()

