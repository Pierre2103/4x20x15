import { generateRoomId } from "../utils/helpers.js";

describe("generateRoomId", () => {
  it("doit générer un ID de 5 caractères", () => {
    const roomId = generateRoomId();
    expect(roomId).toHaveLength(5);
  });

  it("doit contenir uniquement des lettres majuscules", () => {
    const roomId = generateRoomId();
    expect(roomId).toMatch(/^[A-Z]{5}$/);
  });
});
