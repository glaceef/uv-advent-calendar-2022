#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack';
import { BastionHostStack } from '../lib/bastion-host-stack';
import { RdsStack } from '../lib/rds-stack';

const env = {
  account: '',
  region: 'ap-northeast-1',
};

const app = new cdk.App();

// VPC
const vpcStack = new VpcStack(app, 'VpcStack', {
  env,
});

// Bastion Host
const bastionHostStack = new BastionHostStack(app, 'BastionHostStack', {
  vpc: vpcStack.vpc,
  env,
});
bastionHostStack.addDependency(vpcStack);

// RDS
const rdsStack = new RdsStack(app, 'RdsStack', {
  vpc: vpcStack.vpc,
  bastionHostSecurityGroup: bastionHostStack.securityGroup,
  env,
});
rdsStack.addDependency(vpcStack);
rdsStack.addDependency(bastionHostStack);
