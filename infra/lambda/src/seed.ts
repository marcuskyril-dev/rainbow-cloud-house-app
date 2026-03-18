import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const endpoint = process.env.AWS_ENDPOINT;
const client = new DynamoDBClient(endpoint ? { endpoint } : {});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const WISHLIST_TABLE = process.env.WISHLIST_TABLE ?? "WishlistApp";

interface SeedItem {
  name: string;
  description: string;
  price: number;
  category: string;
  priority: "must_have" | "nice_to_have" | "dream";
  imageUrl?: string;
  productUrl?: string;
}

const SEED_ITEMS: SeedItem[] = [
  {
    name: "Linen Bedding Set",
    description: "Luxurious 100% French linen duvet cover and pillowcase set in natural oat.",
    price: 28000,
    category: "Bedroom",
    priority: "must_have",
    productUrl: "https://example.com/linen-bedding",
  },
  {
    name: "KitchenAid Stand Mixer",
    description: "Artisan Series 5-quart tilt-head stand mixer in Pistachio.",
    price: 44900,
    category: "Kitchen",
    priority: "must_have",
    productUrl: "https://example.com/kitchenaid-mixer",
  },
  {
    name: "Art Deco Table Lamp",
    description: "Brass and frosted glass table lamp with geometric design.",
    price: 12500,
    category: "Living Room",
    priority: "nice_to_have",
    productUrl: "https://example.com/art-deco-lamp",
  },
  {
    name: "Breville Barista Express",
    description: "Semi-automatic espresso machine with integrated grinder.",
    price: 69900,
    category: "Kitchen",
    priority: "dream",
    productUrl: "https://example.com/breville-espresso",
  },
  {
    name: "Velvet Armchair",
    description: "Mid-century modern accent chair in emerald green velvet.",
    price: 35000,
    category: "Living Room",
    priority: "nice_to_have",
    productUrl: "https://example.com/velvet-armchair",
  },
  {
    name: "Indoor Fiddle Leaf Fig Tree",
    description: "Large 6ft artificial fiddle leaf fig in woven basket planter.",
    price: 8500,
    category: "Living Room",
    priority: "nice_to_have",
    productUrl: "https://example.com/fiddle-leaf-fig",
  },
  {
    name: "Le Creuset Dutch Oven",
    description: "5.5-quart round Dutch oven in Flame orange. Cast iron, enamel-coated.",
    price: 16000,
    category: "Kitchen",
    priority: "must_have",
    productUrl: "https://example.com/dutch-oven",
  },
  {
    name: "Ceramic Dinner Set",
    description: "Handmade 12-piece stoneware dinner set in speckled cream glaze.",
    price: 21000,
    category: "Kitchen",
    priority: "must_have",
    productUrl: "https://example.com/ceramic-dinner-set",
  },
  {
    name: "Dyson V15 Detect",
    description: "Cordless vacuum with laser dust detection and LCD screen.",
    price: 74900,
    category: "Home",
    priority: "dream",
    productUrl: "https://example.com/dyson-v15",
  },
  {
    name: "Turkish Bath Towel Set",
    description: "Set of 6 premium Turkish cotton towels in white.",
    price: 12000,
    category: "Bathroom",
    priority: "must_have",
    productUrl: "https://example.com/turkish-towels",
  },
  {
    name: "Scented Candle Collection",
    description: "Set of 3 soy wax candles — Cedar & Sage, Wild Fig, Bergamot.",
    price: 6500,
    category: "Living Room",
    priority: "nice_to_have",
    productUrl: "https://example.com/candle-collection",
  },
  {
    name: "Robot Vacuum",
    description: "iRobot Roomba j7+ with automatic dirt disposal and smart mapping.",
    price: 59900,
    category: "Home",
    priority: "dream",
    productUrl: "https://example.com/robot-vacuum",
  },
];

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

async function seed() {
  console.log("Seeding wishlist items...\n");

  const itemIds: string[] = [];
  const now = new Date();

  // Create all items
  const itemRecords = SEED_ITEMS.map((seed, index) => {
    const id = uuidv4();
    itemIds.push(id);
    const createdAt = new Date(now.getTime() - (SEED_ITEMS.length - index) * 60_000).toISOString();

    return {
      PK: `ITEM#${id}`,
      SK: "META",
      entityType: "WishlistItem",
      id,
      name: seed.name,
      description: seed.description,
      price: seed.price,
      imageUrl: seed.imageUrl,
      productUrl: seed.productUrl,
      status: "available",
      totalContributed: 0,
      priority: seed.priority,
      category: seed.category,
      version: 1,
      createdAt,
      updatedAt: createdAt,
      GSI1PK: "ITEMS",
      GSI1SK: `STATUS#available#UPDATED#${createdAt}`,
    };
  });

  // Batch write items (25 items per batch max)
  for (let i = 0; i < itemRecords.length; i += 25) {
    const batch = itemRecords.slice(i, i + 25);
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [WISHLIST_TABLE]: batch.map((item) => ({
            PutRequest: { Item: item },
          })),
        },
      }),
    );
  }

  console.log(`  Created ${itemRecords.length} wishlist items`);

  // ── Add contributions to the KitchenAid Mixer (index 1, $449) ──

  const mixerId = itemIds[1];
  const contributions = [
    { name: "James Wilson", amount: 10000 },
    { name: "Emma Rodriguez", amount: 15000 },
    { name: "David Kim", amount: 5000 },
  ];

  let mixerTotal = 0;
  for (const contrib of contributions) {
    const contribId = uuidv4();
    const contribAt = new Date(
      now.getTime() - (60 - contributions.indexOf(contrib) * 10) * 60_000,
    ).toISOString();

    mixerTotal += contrib.amount;

    await docClient.send(
      new PutCommand({
        TableName: WISHLIST_TABLE,
        Item: {
          PK: `ITEM#${mixerId}`,
          SK: `CON#${contribId}`,
          entityType: "Contribution",
          id: contribId,
          itemId: mixerId,
          contributorName: contrib.name,
          normalizedContributorName: normalizeName(contrib.name),
          amount: contrib.amount,
          createdAt: contribAt,
        },
      }),
    );

    console.log(`  Contribution: KitchenAid Mixer ← ${contrib.name} ($${(contrib.amount / 100).toFixed(2)})`);
  }

  // Update mixer with total contributions
  const mixerUpdatedAt = new Date(now.getTime() - 30 * 60_000).toISOString();
  await docClient.send(
    new PutCommand({
      TableName: WISHLIST_TABLE,
      Item: {
        ...itemRecords[1],
        status: "partially_funded",
        totalContributed: mixerTotal,
        version: 4,
        updatedAt: mixerUpdatedAt,
        GSI1SK: `STATUS#partially_funded#UPDATED#${mixerUpdatedAt}`,
      },
    }),
  );

  // ── Add contributions to the Breville Espresso (index 3, $699) ──

  const espressoId = itemIds[3];
  const espressoContributions = [
    { name: "Priya Patel", amount: 20000 },
    { name: "Tom & Rachel Green", amount: 25000 },
  ];

  let espressoTotal = 0;
  for (const contrib of espressoContributions) {
    const contribId = uuidv4();
    const contribAt = new Date(
      now.getTime() - (90 - espressoContributions.indexOf(contrib) * 20) * 60_000,
    ).toISOString();

    espressoTotal += contrib.amount;

    await docClient.send(
      new PutCommand({
        TableName: WISHLIST_TABLE,
        Item: {
          PK: `ITEM#${espressoId}`,
          SK: `CON#${contribId}`,
          entityType: "Contribution",
          id: contribId,
          itemId: espressoId,
          contributorName: contrib.name,
          normalizedContributorName: normalizeName(contrib.name),
          amount: contrib.amount,
          createdAt: contribAt,
        },
      }),
    );

    console.log(`  Contribution: Breville Espresso ← ${contrib.name} ($${(contrib.amount / 100).toFixed(2)})`);
  }

  const espressoUpdatedAt = new Date(now.getTime() - 50 * 60_000).toISOString();
  await docClient.send(
    new PutCommand({
      TableName: WISHLIST_TABLE,
      Item: {
        ...itemRecords[3],
        status: "partially_funded",
        totalContributed: espressoTotal,
        version: 3,
        updatedAt: espressoUpdatedAt,
        GSI1SK: `STATUS#partially_funded#UPDATED#${espressoUpdatedAt}`,
      },
    }),
  );

  // ── Add contributions to Ceramic Dinner Set (index 7, $210 — fully funded) ──

  const dinnerSetId = itemIds[7];
  const dinnerContributions = [
    { name: "Alex Turner", amount: 7000 },
    { name: "Nina Simmons", amount: 7000 },
    { name: "Chris & Jo Walsh", amount: 7000 },
  ];

  let dinnerTotal = 0;
  for (const contrib of dinnerContributions) {
    const contribId = uuidv4();
    const contribAt = new Date(
      now.getTime() - (120 - dinnerContributions.indexOf(contrib) * 15) * 60_000,
    ).toISOString();

    dinnerTotal += contrib.amount;

    await docClient.send(
      new PutCommand({
        TableName: WISHLIST_TABLE,
        Item: {
          PK: `ITEM#${dinnerSetId}`,
          SK: `CON#${contribId}`,
          entityType: "Contribution",
          id: contribId,
          itemId: dinnerSetId,
          contributorName: contrib.name,
          normalizedContributorName: normalizeName(contrib.name),
          amount: contrib.amount,
          createdAt: contribAt,
        },
      }),
    );

    console.log(`  Contribution: Ceramic Dinner Set ← ${contrib.name} ($${(contrib.amount / 100).toFixed(2)})`);
  }

  const dinnerUpdatedAt = new Date(now.getTime() - 75 * 60_000).toISOString();
  await docClient.send(
    new PutCommand({
      TableName: WISHLIST_TABLE,
      Item: {
        ...itemRecords[7],
        status: "funded",
        totalContributed: dinnerTotal,
        version: 4,
        updatedAt: dinnerUpdatedAt,
        GSI1SK: `STATUS#funded#UPDATED#${dinnerUpdatedAt}`,
      },
    }),
  );

  console.log("\nSeed complete!");
  console.log(`  Items: ${itemRecords.length}`);
  console.log("  Partially funded: 2 (KitchenAid Mixer, Breville Espresso)");
  console.log("  Fully funded: 1 (Ceramic Dinner Set)");
  console.log("  Available: 9");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
