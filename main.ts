// Copyright (c) HashiCorp, Inc
// SPDX-License-Identifier: MPL-2.0
import { Construct } from "constructs";
import { App, TerraformStack, CloudBackend, NamedCloudWorkspace } from "cdktf";
import * as google from '@cdktf/provider-google';

const project = 'curly-chainsaw-369000';
const repository = 'curly-chainsaw';
const region = 'asia-northeast1';

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new google.provider.GoogleProvider(this, 'google', {
      project,
      region,
    });

    const static_address = new google.computeGlobalAddress.ComputeGlobalAddress(this, 'static_address', {
      name: 'staticaddress',
    });

    new google.cloudbuildTrigger.CloudbuildTrigger(this, 'cloud_build_trigger', {
      filename: 'cloudbuild.yaml',
      github: {
        owner: 'hsmtkk',
        name: repository,
        push: {
          branch: 'main',
        },
      },
    });

    const dns_managed_zone = new google.dnsManagedZone.DnsManagedZone(this, 'dns_managed_zone', {
      dnsName: 'curlychainsawa.gq.',
      cloudLoggingConfig: {
        enableLogging: true,
      },
      name: repository,
    });

    new google.dnsRecordSet.DnsRecordSet(this, 'example_record', {
      managedZone: dns_managed_zone.name,
      name: `example.${dns_managed_zone.dnsName}`,
      type: 'A',
      rrdatas: ['8.8.8.8'],
    });

    new google.dnsRecordSet.DnsRecordSet(this, 'whoami_record', {
      managedZone: dns_managed_zone.name,
      name: `whoami.${dns_managed_zone.dnsName}`,
      type: 'A',
      rrdatas: [static_address.address],
    });

    new google.containerCluster.ContainerCluster(this, 'container_cluster', {
      enableAutopilot: true,
      location: region,
      name: repository,
      // To avoid this error
      // googleapi: Error 400: Max pods constraint on node pools for Autopilot clusters should be 32., badRequest 
      ipAllocationPolicy: {},
    });
  }
}

const app = new App();
const stack = new MyStack(app, "curly-chainsaw");
new CloudBackend(stack, {
  hostname: "app.terraform.io",
  organization: "hsmtkkdefault",
  workspaces: new NamedCloudWorkspace("curly-chainsaw")
});
app.synth();
