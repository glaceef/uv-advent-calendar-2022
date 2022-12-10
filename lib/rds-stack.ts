import * as cdk from 'aws-cdk-lib';
import { InstanceClass, InstanceSize, InstanceType, Port, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Credentials, DatabaseInstance, DatabaseInstanceEngine, SubnetGroup } from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

interface RdsStackProps extends cdk.StackProps {
  vpc: Vpc,
  bastionHostSecurityGroup: SecurityGroup,
}

export class RdsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: RdsStackProps) {
    super(scope, id, props);

    const { vpc, bastionHostSecurityGroup } = props;

    const privateSubnets = vpc.selectSubnets({
      subnetType: SubnetType.PRIVATE_ISOLATED,
    });

    // サブネットグループ作成
    const subnetGroup = new SubnetGroup(this, 'example-subnet-group-rds', {
      subnetGroupName: 'example-subnet-group-rds',
      description: 'Subnet group for RDS',
      vpc,
      vpcSubnets: privateSubnets,
    });
    
    // RDSセキュリティグループ作成
    const rdsSecurityGroup = new SecurityGroup(this, 'example-security-group-rds', {
      securityGroupName: 'example-security-group-rds',
      vpc,
    });
    rdsSecurityGroup.addIngressRule(
      bastionHostSecurityGroup,
      Port.tcp(5432),
      'Allow the rds to be communicated from bastion-host ec2 instance'
    );

    // RDSクレデンシャル作成
    const dbUser = 'example';
    const rdsCredentials = Credentials.fromGeneratedSecret(dbUser, {
      secretName: 'example-rds-credentials',
    });

    // RDSインスタンス作成
    new DatabaseInstance(this, 'example-rds', {
      instanceIdentifier: 'example-rds',
      engine: DatabaseInstanceEngine.POSTGRES,
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.SMALL),
      credentials: rdsCredentials,
      autoMinorVersionUpgrade: false,

      vpc,
      subnetGroup,
      securityGroups: [rdsSecurityGroup],
    });
  }
}
