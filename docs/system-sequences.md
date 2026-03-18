# Rainbow Cloud House Wishlist — System Sequences

Critical flows described as Mermaid sequence diagrams. Error paths (409 conflict, 400 validation, 422 unprocessable) are included where applicable.

---

## 1. Public: View Wishlist

```mermaid
sequenceDiagram
    participant Client as Public Client
    participant APIGW as API Gateway
    participant Lambda as Lambda (getItems)
    participant DynamoDB as DynamoDB

    Client->>APIGW: GET /items
    APIGW->>Lambda: Invoke
    Lambda->>DynamoDB: Query (PK = ITEMS)
    DynamoDB-->>Lambda: Items[]
    Lambda-->>APIGW: 200 { items }
    APIGW-->>Client: 200 { items }
```

---

## 2. Public: Reserve Item

```mermaid
sequenceDiagram
    participant Client as Public Client
    participant APIGW as API Gateway
    participant Lambda as Lambda (reserveItem)
    participant DynamoDB as DynamoDB

    Client->>APIGW: POST /reserve { itemId, name, requestId }
    APIGW->>Lambda: Invoke

    alt Validation Error (missing fields, invalid format)
        Lambda-->>APIGW: 400 { message, errors }
        APIGW-->>Client: 400 Bad Request
    else Valid payload
        Lambda->>DynamoDB: Get idempotency key (requestId)
        alt Idempotency key exists → duplicate request
            Lambda-->>APIGW: 200/201 (original response)
            APIGW-->>Client: Success (idempotent)
        else New request
            Lambda->>DynamoDB: TransactWriteItems
                Note over Lambda,DynamoDB: 1. Condition: item.reserved = false<br/>2. Put name lock (itemId + name)<br/>3. Put reservation<br/>4. Update item (reserved = true)
            alt Conflict (item already reserved)
                DynamoDB-->>Lambda: ConditionalCheckFailed
                Lambda-->>APIGW: 409 { message: "Item already reserved" }
                APIGW-->>Client: 409 Conflict
            else Success
                DynamoDB-->>Lambda: OK
                Lambda-->>APIGW: 201 { reservation }
                APIGW-->>Client: 201 Created
            end
        end
    end
```

---

## 3. Public: Contribute to Item

```mermaid
sequenceDiagram
    participant Client as Public Client
    participant APIGW as API Gateway
    participant Lambda as Lambda (contributeToItem)
    participant DynamoDB as DynamoDB

    Client->>APIGW: POST /contribute { itemId, contributorName, amount, requestId }
    APIGW->>Lambda: Invoke

    alt Validation Error (missing fields, amount ≤ 0)
        Lambda-->>APIGW: 400 { message, errors }
        APIGW-->>Client: 400 Bad Request
    else Valid payload
        Lambda->>DynamoDB: Get idempotency key (requestId)
        alt Idempotency key exists
            Lambda-->>APIGW: 200/201 (original response)
            APIGW-->>Client: Success (idempotent)
        else New request
            Lambda->>DynamoDB: TransactWriteItems
                Note over Lambda,DynamoDB: 1. Condition: item.totalContributed + amount ≤ item.price<br/>2. Put contribution record<br/>3. Update item totalContributed
            alt Conflict (totalContributed + amount > price)
                DynamoDB-->>Lambda: ConditionalCheckFailed
                Lambda-->>APIGW: 409 { message: "Contribution would exceed item price" }
                APIGW-->>Client: 409 Conflict
            else Success
                DynamoDB-->>Lambda: OK
                Lambda-->>APIGW: 201 { contribution }
                APIGW-->>Client: 201 Created
            end
        end
    end
```

---

## 4. Admin: Add Item

```mermaid
sequenceDiagram
    participant Client as Admin Client
    participant APIGW as API Gateway
    participant Lambda as Lambda (createItem)
    participant DynamoDB as DynamoDB

    Client->>APIGW: POST /items { ... } + Authorization: Bearer <JWT>
    APIGW->>APIGW: Validate JWT (Cognito authorizer)
    alt Unauthorized (no/invalid token)
        APIGW-->>Client: 401 Unauthorized
    else Authorized
        APIGW->>Lambda: Invoke (with body)

        alt Validation Error (zod schema)
            Lambda-->>APIGW: 400 { message, errors }
            APIGW-->>Client: 400 Bad Request
        else Valid payload
            Lambda->>DynamoDB: PutItem (new item)
            DynamoDB-->>Lambda: OK
            Lambda-->>APIGW: 201 { item }
            APIGW-->>Client: 201 Created
        end
    end
```

---

## 5. Admin: Metadata Fetch

```mermaid
sequenceDiagram
    participant Client as Admin Client
    participant APIGW as API Gateway
    participant Lambda as Lambda (fetchMetadata)
    participant External as Target URL
    participant S3 as S3 (optional)

    Client->>APIGW: POST /items/:id/metadata-fetch { url } + Authorization: Bearer <JWT>
    APIGW->>APIGW: Validate JWT
    alt Unauthorized
        APIGW-->>Client: 401 Unauthorized
    else Authorized
        APIGW->>Lambda: Invoke

        Lambda->>External: GET url (fetch HTML)
        External-->>Lambda: HTML

        alt Fetch/Parse Error
            Lambda-->>APIGW: 422 { message: "Unable to fetch or parse URL" }
            APIGW-->>Client: 422 Unprocessable Entity
        else Success
            Lambda->>Lambda: Extract OG tags (og:title, og:image, og:description)
            opt Mirror image to S3
                Lambda->>S3: PutObject (image from og:image URL)
                S3-->>Lambda: S3 URL
                Lambda->>Lambda: Use S3 URL instead of original
            end
            Lambda-->>APIGW: 200 { title, image, description, ... }
            APIGW-->>Client: 200 OK
        end
    end
```

---

## 6. Admin: Upload Image

```mermaid
sequenceDiagram
    participant Client as Admin Client
    participant APIGW as API Gateway
    participant Lambda as Lambda (getPresignedUploadUrl)
    participant S3 as S3

    Client->>APIGW: POST /items/:id/upload-url (or /upload-url) + Authorization: Bearer <JWT>
    APIGW->>APIGW: Validate JWT
    alt Unauthorized
        APIGW-->>Client: 401 Unauthorized
    else Authorized
        APIGW->>Lambda: Invoke

        Lambda->>Lambda: Generate presigned PUT URL (content-type, key)
        Lambda->>S3: (no direct call; URL pre-signed)
        Lambda-->>APIGW: 200 { uploadUrl, expiresIn }
        APIGW-->>Client: 200 { uploadUrl }

        Note over Client,S3: Client uploads file directly to S3 (no Lambda in path)
        Client->>S3: PUT uploadUrl (file body)
        S3-->>Client: 200 OK

        Client->>APIGW: POST /items { imageUrl: <S3 URL> } or PUT /items/:id { imageUrl }
        Note over Client,APIGW: Item create/update includes the S3 URL
    end
```

---

## Error Summary

| HTTP | Use Case |
|------|----------|
| **400** | Validation errors (missing/invalid fields, schema violations) |
| **401** | Missing or invalid JWT (admin endpoints) |
| **409** | Conflict: item already reserved, contribution exceeds price, or similar invariant violation |
| **422** | Unprocessable: e.g. metadata fetch failed, URL unreachable |
