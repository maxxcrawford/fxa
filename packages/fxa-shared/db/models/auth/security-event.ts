/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import crypto from 'crypto';
import ip from 'ip';
import { BaseAuthModel, Proc } from './base-auth';
import { uuidTransformer, intBoolTransformer } from '../../transformers';
import { convertError } from '../../mysql';

const EVENT_NAMES = {
  'account.create': 1,
  'account.login': 2,
  'account.reset': 3,
} as const;

export type SecurityEventNames = keyof typeof EVENT_NAMES;

function ipHmac(key: Buffer, uid: Buffer, addr: string) {
  if (ip.isV4Format(addr)) {
    addr = '::' + addr;
  }

  const hmac = crypto.createHmac('sha256', key);
  hmac.update(uid);
  hmac.update(ip.toBuffer(addr));

  return hmac.digest();
}

export class SecurityEvent extends BaseAuthModel {
  public static tableName = 'securityEvents';
  public static idColumn = ['uid', 'ipAddrHmac', 'createdAt'];

  protected $uuidFields = ['uid', 'ipAddrHmac', 'tokenVerificationId'];
  protected $intBoolFields = ['verified'];

  // table fields
  uid?: string;
  ipAddrHmac?: string;
  tokenVerificationId?: string;
  name!: SecurityEventNames;
  createdAt!: number;
  verified!: boolean;

  static async create({
    uid,
    name,
    tokenId,
    ipAddr,
  }: {
    uid: string;
    name: SecurityEventNames;
    ipAddr: string;
    tokenId?: string;
  }) {
    const id = uuidTransformer.to(uid);
    const ipAddrHmac = ipHmac(Buffer.from([0]), id, ipAddr); //TODO
    try {
      await SecurityEvent.callProcedure(
        Proc.CreateSecurityEvent,
        id,
        tokenId ? uuidTransformer.to(tokenId) : null,
        EVENT_NAMES[name],
        ipAddrHmac,
        Date.now()
      );
    } catch (e) {
      console.error(e);
      throw convertError(e);
    }
  }

  static async delete(uid: string) {
    try {
      await SecurityEvent.callProcedure(
        Proc.DeleteSecurityEvents,
        uuidTransformer.to(uid)
      );
    } catch (e) {
      console.error(e);
      throw convertError(e);
    }
  }

  static async findByUid(uid: string) {
    const id = uuidTransformer.to(uid);
    return SecurityEvent.query()
      .select(
        'securityEventNames.name as name',
        'securityEvents.verified as verified',
        'securityEvents.createdAt as createdAt'
      )
      .leftJoin(
        'securityEventNames',
        'securityEvents.nameId',
        'securityEventNames.id'
      )
      .where('securityEvents.uid', id)
      .orderBy('securityEvents.createdAt', 'DESC')
      .limit(20);
  }

  static async findByUidAndIP(uid: string, ipAddr: string) {
    const id = uuidTransformer.to(uid);
    const ipAddrHmac = ipHmac(Buffer.from([0]), id, ipAddr); //TODO
    return SecurityEvent.query()
      .select(
        'securityEventNames.name as name',
        'securityEvents.verified as verified',
        'securityEvents.createdAt as createdAt'
      )
      .leftJoin(
        'securityEventNames',
        'securityEvents.nameId',
        'securityEventNames.id'
      )
      .where('securityEvents.uid', id)
      .andWhere('securityEvents.ipAddrHmac', ipAddrHmac)
      .orderBy('securityEvents.createdAt', 'DESC')
      .limit(20);
  }
}
