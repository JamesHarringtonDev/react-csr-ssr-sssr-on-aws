#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ReactCsrCdkStack } from "../lib/react-csr-cdk-stack";

const app = new cdk.App();
new ReactCsrCdkStack(app, "ReactCsrCdkStack");
