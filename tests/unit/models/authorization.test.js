import { InternalServerError } from "infra/errors";

import authorization from "models/authorization";

describe("models/authorization.js", () => {
  describe("authorization.can", () => {
    test("Without 'user'", () => {
      expect(() => {
        authorization.can();
      }).toThrow(InternalServerError);
    });

    test("Without 'user.features'", () => {
      const testUser = { username: "UserWithoutFeatures" };

      expect(() => {
        authorization.can(testUser);
      }).toThrow(InternalServerError);
    });

    test("With unknown 'features'", () => {
      const testUser = { features: [] };

      expect(() => {
        authorization.can(testUser, "unknown:feature");
      }).toThrow(InternalServerError);
    });

    test("With valid 'user' and known 'feature'", () => {
      const testUser = { features: ["create:user"] };

      expect(authorization.can(testUser, "create:user")).toBe(true);
    });
  });

  describe("authorization.filterOutput", () => {
    test("Without 'user'", () => {
      expect(() => {
        authorization.filterOutput();
      }).toThrow(InternalServerError);
    });

    test("Without 'user.features'", () => {
      const testUser = { username: "UserWithoutFeatures" };

      expect(() => {
        authorization.filterOutput(testUser);
      }).toThrow(InternalServerError);
    });

    test("With unknown 'features'", () => {
      const testUser = { features: [] };

      expect(() => {
        authorization.filterOutput(testUser, "unknown:feature");
      }).toThrow(InternalServerError);
    });

    test("With valid 'user', known 'feature' but no 'resource'", () => {
      const testUser = { features: ["read:user"] };

      expect(() => {
        authorization.filterOutput(testUser, "read:user");
      }).toThrow(InternalServerError);
    });

    test("With valid 'user', known 'feature' and 'resource'", () => {
      const testUser = { features: ["read:user"] };
      const testResource = {
        id: 1,
        username: "resource",
        features: ["read:user"],
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        email: "resource@teste.com",
        password: "resource",
      };

      const result = authorization.filterOutput(testUser, "read:user", testResource);

      expect(result).toEqual({
        id: 1,
        username: "resource",
        features: ["read:user"],
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      });
    });
  });
});
