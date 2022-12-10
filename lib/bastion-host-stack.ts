import * as cdk from 'aws-cdk-lib';
import { BastionHostLinux, GatewayVpcEndpoint, GatewayVpcEndpointAwsService, InstanceClass, InstanceSize, InstanceType, InterfaceVpcEndpoint, InterfaceVpcEndpointService, Peer, Port, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

interface BastionHostStackProps extends cdk.StackProps {
  vpc: Vpc,
}

export class BastionHostStack extends cdk.Stack {
  public readonly securityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: BastionHostStackProps) {
    super(scope, id, props);

    const { vpc } = props;

    const privateSubnets = vpc.selectSubnets({
      subnetType: SubnetType.PRIVATE_ISOLATED,
    });

    // プライベートVPCとSSMを接続できるようにするための設定
    // https://aws.amazon.com/jp/premiumsupport/knowledge-center/ec2-systems-manager-vpc-endpoints/
    ['ssm', 'ec2messages', 'ssmmessages'].forEach(label => {
      const endpoint = `com.amazonaws.ap-northeast-1.${label}`;
      new InterfaceVpcEndpoint(this, `example-interface-vpc-endpoint-${label}`, {
        vpc,
        subnets: privateSubnets,
        service: new InterfaceVpcEndpointService(endpoint, 443),
        privateDnsEnabled: true,
      });
    });

    // EC2インスタンスが yum コマンドを実行できるように（外部へ接続できるように）するために必要
    // https://aws.amazon.com/jp/premiumsupport/knowledge-center/ec2-al1-al2-update-yum-without-internet/
    new GatewayVpcEndpoint(this, 'example-gateway-vpc-endpoint-s3', {
      vpc,
      subnets: [privateSubnets],
      service: GatewayVpcEndpointAwsService.S3,
    });

    // セキュリティグループ作成
    this.securityGroup = new SecurityGroup(this, 'example-security-group-bastion-host', {
      securityGroupName: 'example-security-group-bastion-host',
      vpc,
      allowAllOutbound: false, // デフォルトで true なので明示的に false を指定する
    });
    [22, 443, 5432].forEach(port => {
      this.securityGroup.addEgressRule(
        Peer.ipv4('0.0.0.0/0'),
        Port.tcp(port)
      );
    });

    // Bastion Host (EC2 インスタンス) を構築
    const host = new BastionHostLinux(this, 'example-bastion-host', {
      instanceName: 'example-bastion-host',
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.SMALL),
      vpc,
      subnetSelection: privateSubnets,
      securityGroup: this.securityGroup,
    });

    // AWSコンソール -> System Manager -> セッションマネージャー のコンソールで yum や psql コマンドを使用するため
    host.instance.addUserData([
      'yum -y update',
      'amazon-linux-extras install postgresql13',
    ].join(' && '));
  }
}
