# This script requires suds that provides SOAP bindings for python.
# Download suds from https://fedorahosted.org/suds/
# unpack it and then run:
# python setup.py install
# This may require you to install setuptools (an .exe from python.org)

from WebService import WSOpts

from suds import null
from ConfigService import ConfigServiceClient
from DefectService import DefectServiceClient
import sys
import datetime
import logging

"""
random examples showing manipulation of custom attributes via WS
"""
def main():
    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()

    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ()):
        parser.print_help()
        sys.exit(-1)

    configServiceClient = ConfigServiceClient(options)
    defectServiceClient = DefectServiceClient(options)

    a = configServiceClient.client.service.getAttribute({'name':'custom'})
    attrDefSpec = configServiceClient.client.factory.create('attributeDefinitionSpecDataObj')
    attrDefSpec.attributeName='custom'
    attrDefSpec.attributeType=a.attributeType
    attrDefSpec.showInTriage=a.showInTriage
    attrDefSpec.description='attempt to get something to change'
    changeSpec = configServiceClient.client.factory.create('attributeValueChangeSpecDataObj')
    changeSpec.attributeValueIds=[]
    changeSpec.attributeValues=[]
    attribValId = configServiceClient.client.factory.create('attributeValueId')
    attribVal = configServiceClient.client.factory.create('attributeValueSpecDataObj')
    attribValId.name = 'four'
    attribVal.name = 'five'
    changeSpec.attributeValueIds.append(attribValId)
    changeSpec.attributeValues.append(attribVal)
    attribValId = configServiceClient.client.factory.create('attributeValueId')
    attribVal = configServiceClient.client.factory.create('attributeValueSpecDataObj')
    attribValId = null()
    attribVal.name = 'one'
    changeSpec.attributeValueIds.append(attribValId)
    changeSpec.attributeValues.append(attribVal)
    attribValId = configServiceClient.client.factory.create('attributeValueId')
    attribVal = configServiceClient.client.factory.create('attributeValueSpecDataObj')
    attribValId = null()
    attribVal.name = 'two'
    changeSpec.attributeValueIds.append(attribValId)
    changeSpec.attributeValues.append(attribVal)
    attribValId = configServiceClient.client.factory.create('attributeValueId')
    attribVal = configServiceClient.client.factory.create('attributeValueSpecDataObj')
    attribValId = null()
    attribVal.name = 'three'
    changeSpec.attributeValueIds.append(attribValId)
    changeSpec.attributeValues.append(attribVal)
    print changeSpec
    attrDefSpec.attributeValueChangeSpec=changeSpec
    print a.attributeDefinitionId
    print attrDefSpec
    configServiceClient.client.service.updateAttribute(a.attributeDefinitionId, attrDefSpec)
    print configServiceClient.client.service.getAttribute({'name':'custom'})

# -----------------------------------------------------------------------------

if __name__ == '__main__':
    main()
