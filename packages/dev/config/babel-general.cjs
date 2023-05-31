// Copyright 2023-2023 zc.zhang authors & contributors
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  assumptions: {
    // ensure that ?. & ?? uses !=/== null checks (not also undefined)
    noDocumentAll: true,
    // no extra defineProperty for private class fields
    privateFieldsAsProperties: true,
    // no extra defineProperty for public class fields
    setPublicClassFields: true
  }
  // Really want to switch this on, but not as of yet...
  // comments: false
};
