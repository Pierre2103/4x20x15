export const generateRoomId = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return Array(5)
      .fill("")
      .map(() => characters.charAt(Math.floor(Math.random() * characters.length)))
      .join("");
  };
  