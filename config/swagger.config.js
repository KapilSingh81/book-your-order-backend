import swaggerJSDoc from "swagger-jsdoc";

const port = process.env.PORT || 8000;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Book Your Order API",
      version: "1.0.0",
      description: "QR table ordering for hotels and restaurants. Login first, then press Authorize and paste the token.",
    },
    servers: [{ url: process.env.BASE_URL || `http://localhost:${port}`, description: "Server" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  apis: ["./routes/*.js"],
};

export const swaggerSpec = swaggerJSDoc(options);
