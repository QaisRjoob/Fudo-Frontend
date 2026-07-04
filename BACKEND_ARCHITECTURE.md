# Fudo App — Microservices Backend Architecture (ASP.NET)

> Complete reference document covering service design, CQRS, DTOs, Pagination,
> Authentication, Authorization, API Gateway, and Load Balancing.

---

## Table of Contents

1. [Services Map](#1-services-map)
2. [Solution Structure](#2-solution-structure)
3. [Authentication — Identity.API](#3-authentication--identityapi)
4. [Authorization](#4-authorization)
5. [DTOs](#5-dtos)
6. [CQRS with MediatR](#6-cqrs-with-mediatr)
7. [Pagination](#7-pagination)
8. [Service-by-Service Endpoints](#8-service-by-service-endpoints)
9. [Inter-Service Communication](#9-inter-service-communication)
10. [API Gateway (YARP)](#10-api-gateway-yarp)
11. [Load Balancer](#11-load-balancer)
12. [SignalR Special Case](#12-signalr-special-case)
13. [Recommended Deployment Stack](#13-recommended-deployment-stack)
14. [Global Error Handling](#14-global-error-handling)
15. [Build Order Recommendation](#15-build-order-recommendation)

---

## 1. Services Map

These are the **8 individual microservices** the Fudo app requires.
Each is an independent ASP.NET Web API project with its own database schema.

| # | Service | Database | Responsibility |
|---|---------|----------|----------------|
| 1 | **Identity.API** | SQL Server | Register, login, JWT tokens, refresh tokens, password change, blocked accounts |
| 2 | **User.API** | SQL Server | Profiles, follow/unfollow, suggested users, search, settings, gender/avatar |
| 3 | **Post.API** | SQL Server | Create/edit/delete/archive posts, recipe fields (ingredients, steps, nutrition, tags) |
| 4 | **Feed.API** | Redis + SQL Server | Personalized feed assembly from followed users, impression tracking |
| 5 | **Story.API** | SQL Server + Redis | Create stories, 24h expiry, highlights, replies, archive |
| 6 | **Interaction.API** | SQL Server | Likes, saves, comments, collections |
| 7 | **Messaging.API** | SQL Server + SignalR | Conversations, real-time chat messages |
| 8 | **Notification.API** | SQL Server + Redis | Push notifications, unread counts, activity feed |

**Cross-cutting infrastructure:**

- **Media.Service** — not an API; a shared library or dedicated blob-upload service.
  Handles image/video upload to Azure Blob or S3 and returns CDN URLs.
  Called internally by Post.API and Story.API.

---

## 2. Solution Structure

```
Fudo.Backend/
├── ApiGateway/                    ← YARP reverse proxy (single entry point for mobile)
├── Services/
│   ├── Identity.API/
│   ├── User.API/
│   ├── Post.API/
│   ├── Feed.API/
│   ├── Story.API/
│   ├── Interaction.API/
│   ├── Messaging.API/
│   └── Notification.API/
├── SharedKernel/                  ← NuGet package shared by all services
│   ├── Pagination/
│   ├── BaseEntities/
│   ├── Events/                    ← Integration event contracts
│   └── Exceptions/
└── docker-compose.yml
```

Each service follows this internal folder layout:

```
Identity.API/
├── Controllers/
├── Application/
│   ├── Commands/          ← CQRS write side
│   ├── Queries/           ← CQRS read side
│   ├── DTOs/
│   └── Validators/
├── Domain/
│   ├── Entities/
│   ├── Events/            ← Domain events
│   └── Interfaces/
├── Infrastructure/
│   ├── Persistence/       ← EF Core DbContext, Migrations
│   ├── Repositories/
│   └── ExternalServices/
└── Program.cs
```

---

## 3. Authentication — Identity.API

Use **JWT Bearer + Refresh Tokens**. No sessions — the mobile client stores
tokens in secure storage.

### Token Strategy

```csharp
// Access token:  short-lived (15 minutes)
// Refresh token: long-lived  (30 days), stored hashed in DB

public class TokenResponse
{
    public string   AccessToken  { get; init; }
    public string   RefreshToken { get; init; }
    public DateTime ExpiresAt    { get; init; }
}
```

### Registration Command

```csharp
// Command
public record RegisterCommand(
    string Username,
    string DisplayName,
    string Email,
    string Password,
    string Gender          // "male" | "female"
) : IRequest<TokenResponse>;

// Handler
public class RegisterCommandHandler : IRequestHandler<RegisterCommand, TokenResponse>
{
    public async Task<TokenResponse> Handle(RegisterCommand cmd, CancellationToken ct)
    {
        // 1. Validate uniqueness (username + email)
        // 2. Hash password with BCrypt
        // 3. Create User entity
        // 4. Generate JWT + refresh token
        // 5. Publish UserRegisteredIntegrationEvent → message bus
        // 6. Return TokenResponse
    }
}
```

### JWT Configuration (Program.cs)

```csharp
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new()
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = config["Jwt:Issuer"],
            ValidAudience            = config["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(config["Jwt:Secret"]!)),
            ClockSkew                = TimeSpan.Zero   // no grace period
        };
    });
```

### JWT Claims Design

```csharp
// Claims embedded in every access token — no DB lookup needed per request
new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),   // sub
new Claim(ClaimTypes.Name,           user.Username),
new Claim("display_name",            user.DisplayName),
new Claim(ClaimTypes.Role,           user.Role),            // "user" | "admin"
new Claim("email_verified",          user.EmailVerified.ToString())
```

---

## 4. Authorization

Use **ASP.NET Policy-Based Authorization**, not role strings scattered across
controllers.

### Policy Registration

```csharp
builder.Services.AddAuthorization(options =>
{
    // Must be the resource owner (e.g., edit own post)
    options.AddPolicy("ResourceOwner", policy =>
        policy.Requirements.Add(new ResourceOwnerRequirement()));

    // Verified (non-blocked) user
    options.AddPolicy("ActiveUser", policy =>
        policy.RequireAuthenticatedUser()
              .RequireClaim("email_verified", "True"));

    // Admin only
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole("admin"));
});
```

### Resource Owner Handler (Post.API example)

```csharp
public class ResourceOwnerHandler
    : AuthorizationHandler<ResourceOwnerRequirement, Post>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext ctx,
        ResourceOwnerRequirement req,
        Post resource)
    {
        var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (resource.AuthorId.ToString() == userId)
            ctx.Succeed(req);
        return Task.CompletedTask;
    }
}

// Controller usage
[HttpDelete("{id}")]
public async Task<IActionResult> Delete(Guid id)
{
    var post = await _repo.GetByIdAsync(id);
    await _authz.AuthorizeAsync(User, post, "ResourceOwner");
    // proceed with delete...
}
```

---

## 5. DTOs

Never expose domain entities directly. Every API surface uses dedicated DTOs
per operation.

### Naming Convention

| Suffix | Direction | Example |
|--------|-----------|---------|
| `Request` | Client → Server | `CreatePostRequest` |
| `Response` | Server → Client | `PostResponse` |
| `Summary` | Lightweight list item | `PostSummary` |
| `Detail` | Full single-item view | `PostDetail` |

### Example — Post.API

```csharp
// ── Inbound ──────────────────────────────────────────────────────────────────
public record CreatePostRequest(
    string?      Title,
    string?      Caption,
    List<string> Tags,
    List<string> Ingredients,
    List<string> Steps,
    int?         CookTime,
    int?         Servings,
    int?         Calories,
    int?         Protein,
    int?         Carbs,
    int?         Fat
);

// ── Outbound (list) ───────────────────────────────────────────────────────────
public record PostSummary(
    Guid   Id,
    string ThumbnailUri,
    string Title,
    int    LikesCount,
    int    CommentsCount,
    bool   IsLiked,
    bool   IsSaved
);

// ── Outbound (detail) ─────────────────────────────────────────────────────────
public record PostDetail(
    Guid           Id,
    AuthorSummary  Author,
    string?        Title,
    string?        Caption,
    List<string>   Tags,
    List<string>   Ingredients,
    List<string>   Steps,
    List<MediaDto> Media,
    NutritionDto?  Nutrition,
    int            CookTime,
    int            Servings,
    int            LikesCount,
    int            CommentsCount,
    bool           IsLiked,
    bool           IsSaved,
    DateTime       CreatedAt
);

public record NutritionDto(int Calories, int Protein, int Carbs, int Fat);
public record AuthorSummary(Guid Id, string Username, string? AvatarUri, bool IsFollowing);
```

> Use **AutoMapper** or **Mapster** to map entities → DTOs inside query
> handlers, never in controllers.

---

## 6. CQRS with MediatR

**Install:** `MediatR`, `FluentValidation.AspNetCore`

Every operation is either a **Command** (mutates state) or a **Query**
(reads state). Controllers are thin dispatchers only.

### Command Pattern

```csharp
// 1. Define the command
public record LikePostCommand(Guid PostId, Guid UserId) : IRequest<Unit>;

// 2. Validate (runs automatically via MediatR pipeline)
public class LikePostCommandValidator : AbstractValidator<LikePostCommand>
{
    public LikePostCommandValidator()
    {
        RuleFor(x => x.PostId).NotEmpty();
        RuleFor(x => x.UserId).NotEmpty();
    }
}

// 3. Handle
public class LikePostCommandHandler : IRequestHandler<LikePostCommand, Unit>
{
    private readonly IPostRepository _posts;
    private readonly IPublisher      _bus;

    public async Task<Unit> Handle(LikePostCommand cmd, CancellationToken ct)
    {
        var post = await _posts.GetByIdAsync(cmd.PostId, ct)
            ?? throw new NotFoundException(nameof(Post), cmd.PostId);

        post.AddLike(cmd.UserId);           // domain method, raises domain event
        await _posts.SaveChangesAsync(ct);

        await _bus.Publish(
            new PostLikedIntegrationEvent(cmd.PostId, cmd.UserId));

        return Unit.Value;
    }
}

// 4. Controller (thin dispatcher only)
[HttpPost("{id}/like")]
[Authorize(Policy = "ActiveUser")]
public async Task<IActionResult> Like(Guid id)
{
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    await _mediator.Send(new LikePostCommand(id, userId));
    return NoContent();
}
```

### Query Pattern

```csharp
public record GetPostDetailQuery(Guid PostId, Guid RequesterId)
    : IRequest<PostDetail>;

public class GetPostDetailHandler
    : IRequestHandler<GetPostDetailQuery, PostDetail>
{
    public async Task<PostDetail> Handle(GetPostDetailQuery q, CancellationToken ct)
    {
        // Read-optimized: use EF projection with AsNoTracking — no change tracking
        var post = await _db.Posts
            .AsNoTracking()
            .Include(p => p.Media)
            .Include(p => p.Author)
            .Where(p => p.Id == q.PostId && !p.IsArchived)
            .Select(p => new PostDetail(
                p.Id,
                /* ... map all fields ... */
                IsLiked: p.Likes.Any(l => l.UserId == q.RequesterId),
                IsSaved: p.Saves.Any(s => s.UserId == q.RequesterId)
            ))
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException(nameof(Post), q.PostId);

        return post;
    }
}
```

### MediatR Pipeline Behaviors

```csharp
// Registered globally — runs before every handler in order
builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(TransactionBehavior<,>));
```

---

## 7. Pagination

Use **two strategies** depending on context.

### Cursor-Based (Feed, Stories, Reels — infinite scroll)

Uses an opaque base64 cursor encoding `(createdAt, id)` to prevent the
duplicate-row problem that offset pagination causes on live data.

```csharp
// SharedKernel
public record CursorPage<T>(
    List<T> Items,
    string? NextCursor,    // null = no more pages
    bool    HasMore
);

public static class CursorPaginationHelper
{
    public static string Encode(DateTime createdAt, Guid id)
    {
        var raw = $"{createdAt:O}|{id}";
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(raw));
    }

    public static (DateTime CreatedAt, Guid Id) Decode(string cursor)
    {
        var raw   = Encoding.UTF8.GetString(Convert.FromBase64String(cursor));
        var parts = raw.Split('|');
        return (DateTime.Parse(parts[0]), Guid.Parse(parts[1]));
    }
}

// Feed query usage
public async Task<CursorPage<PostSummary>> Handle(GetFeedQuery q, CancellationToken ct)
{
    IQueryable<Post> query = _db.Posts
        .Where(p => followedIds.Contains(p.AuthorId) && !p.IsArchived)
        .OrderByDescending(p => p.CreatedAt).ThenByDescending(p => p.Id);

    if (q.Cursor is not null)
    {
        var (after, afterId) = CursorPaginationHelper.Decode(q.Cursor);
        query = query.Where(p =>
            p.CreatedAt < after ||
            (p.CreatedAt == after && p.Id < afterId));
    }

    var items   = await query.Take(q.PageSize + 1).ToListAsync(ct);
    var hasMore = items.Count > q.PageSize;
    if (hasMore) items.RemoveAt(items.Count - 1);

    var nextCursor = hasMore
        ? CursorPaginationHelper.Encode(items.Last().CreatedAt, items.Last().Id)
        : null;

    return new CursorPage<PostSummary>(Map(items), nextCursor, hasMore);
}
```

### Offset-Based (Admin panels, search results, followers list)

```csharp
public record PagedResult<T>(
    List<T> Items,
    int     TotalCount,
    int     Page,
    int     PageSize,
    int     TotalPages
);

// EF Core extension method (SharedKernel)
public static async Task<PagedResult<T>> ToPagedResultAsync<T>(
    this IQueryable<T> query,
    int page,
    int pageSize,
    CancellationToken ct)
{
    var total = await query.CountAsync(ct);
    var items = await query
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync(ct);

    return new PagedResult<T>(
        items, total, page, pageSize,
        (int)Math.Ceiling(total / (double)pageSize));
}
```

---

## 8. Service-by-Service Endpoints

### Identity.API

```
POST   /api/auth/register          RegisterCommand
POST   /api/auth/login             LoginQuery
POST   /api/auth/refresh           RefreshTokenCommand
POST   /api/auth/logout            LogoutCommand
POST   /api/auth/change-password   ChangePasswordCommand
```

### User.API

```
GET    /api/users/{id}             GetUserProfileQuery
PUT    /api/users/me               UpdateProfileCommand
GET    /api/users/suggested        GetSuggestedUsersQuery      (cursor paginated)
POST   /api/users/{id}/follow      FollowUserCommand
DELETE /api/users/{id}/follow      UnfollowUserCommand
GET    /api/users/{id}/followers   GetFollowersQuery           (cursor paginated)
GET    /api/users/{id}/following   GetFollowingQuery           (cursor paginated)
POST   /api/users/{id}/block       BlockUserCommand
GET    /api/users/search?q=        SearchUsersQuery            (offset paginated)
```

### Post.API

```
POST   /api/posts                  CreatePostCommand
GET    /api/posts/{id}             GetPostDetailQuery
PUT    /api/posts/{id}             UpdatePostCommand           [ResourceOwner]
DELETE /api/posts/{id}             DeletePostCommand           [ResourceOwner]
POST   /api/posts/{id}/archive     ArchivePostCommand          [ResourceOwner]
GET    /api/posts/archived         GetArchivedPostsQuery       (offset paginated)
GET    /api/posts/reels            GetReelsQuery               (cursor paginated)
GET    /api/users/{id}/posts       GetUserPostsQuery           (cursor paginated)
```

### Feed.API

```
GET    /api/feed                   GetFeedQuery                (cursor paginated)
```

### Story.API

```
POST   /api/stories                CreateStoryCommand
GET    /api/stories/active         GetActiveStoriesGroupedQuery
POST   /api/stories/{id}/view      IncrementStoryViewCommand
POST   /api/stories/{id}/reply     ReplyToStoryCommand
DELETE /api/stories/{id}           DeleteStoryCommand          [ResourceOwner]
GET    /api/stories/archive        GetArchivedStoriesQuery     (offset paginated)
POST   /api/highlights             CreateHighlightCommand
DELETE /api/highlights/{id}        DeleteHighlightCommand
```

### Interaction.API

```
POST   /api/posts/{id}/like        LikePostCommand
DELETE /api/posts/{id}/like        UnlikePostCommand
POST   /api/posts/{id}/save        SavePostCommand
DELETE /api/posts/{id}/save        UnsavePostCommand
GET    /api/posts/{id}/likes       GetPostLikesQuery           (cursor paginated)
POST   /api/posts/{id}/comments    AddCommentCommand
DELETE /api/comments/{id}          DeleteCommentCommand        [ResourceOwner]
GET    /api/posts/{id}/comments    GetCommentsQuery            (cursor paginated)
```

### Messaging.API

```
GET    /api/conversations                    GetConversationsQuery   (offset paginated)
POST   /api/conversations                    CreateConversationCommand
GET    /api/conversations/{id}/messages      GetMessagesQuery        (cursor paginated)
POST   /api/conversations/{id}/messages      SendMessageCommand
// Real-time WebSocket:
       /hubs/chat                            SignalR Hub
```

### Notification.API

```
GET    /api/notifications              GetNotificationsQuery    (cursor paginated)
POST   /api/notifications/read         MarkAllReadCommand
GET    /api/notifications/unread-count GetUnreadCountQuery
```

---

## 9. Inter-Service Communication

Services communicate **asynchronously** via an event bus (RabbitMQ + MassTransit)
for eventual consistency. Direct HTTP calls (via HttpClientFactory) are only used
for synchronous reads that are blocking.

```
Event                    →  Consumer
─────────────────────────────────────────────────────────────
UserRegistered           →  Notification.API  (send welcome notification)
PostCreated              →  Feed.API          (fan out to followers' feed cache)
PostLiked                →  Notification.API  (notify post author)
UserFollowed             →  Notification.API  (notify followed user)
                         →  Feed.API          (add follower's feed entries)
StoryExpired             →  Story.API         (move to archive — Hangfire background job)
```

---

## 10. API Gateway (YARP)

The mobile app calls **one base URL only** (e.g., `https://api.fudo.com`).
The gateway handles routing, JWT validation, rate limiting, SSL termination,
and request correlation IDs.

```
Mobile App
    │
    ▼
[ Load Balancer ]          ← distributes across gateway instances
    │
    ▼
[ API Gateway (YARP) ]     ← single entry point, cross-cutting concerns
    │
    ├──→ Identity.API
    ├──→ User.API
    ├──→ Post.API
    ├──→ Feed.API
    ├──→ Story.API
    ├──→ Interaction.API
    ├──→ Messaging.API     (SignalR — sticky sessions)
    └──→ Notification.API
```

### Gateway Program.cs

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(/* same JWT config as services */);

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("global", o =>
    {
        o.PermitLimit          = 100;
        o.Window               = TimeSpan.FromMinutes(1);
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit           = 10;
    });
});

var app = builder.Build();
app.UseRateLimiter();
app.UseAuthentication();
app.MapReverseProxy();
app.Run();
```

### Gateway appsettings.json

```json
{
  "ReverseProxy": {
    "Routes": {
      "identity-route": {
        "ClusterId": "identity-cluster",
        "Match": { "Path": "/api/auth/{**catch-all}" }
      },
      "user-route": {
        "ClusterId": "user-cluster",
        "Match": { "Path": "/api/users/{**catch-all}" },
        "AuthorizationPolicy": "default"
      },
      "post-route": {
        "ClusterId": "post-cluster",
        "Match": { "Path": "/api/posts/{**catch-all}" },
        "AuthorizationPolicy": "default"
      },
      "feed-route": {
        "ClusterId": "feed-cluster",
        "Match": { "Path": "/api/feed/{**catch-all}" },
        "AuthorizationPolicy": "default"
      },
      "story-route": {
        "ClusterId": "story-cluster",
        "Match": { "Path": "/api/stories/{**catch-all}" },
        "AuthorizationPolicy": "default"
      },
      "interaction-route": {
        "ClusterId": "interaction-cluster",
        "Match": { "Path": "/api/posts/{**catch-all}" },
        "AuthorizationPolicy": "default"
      },
      "notification-route": {
        "ClusterId": "notification-cluster",
        "Match": { "Path": "/api/notifications/{**catch-all}" },
        "AuthorizationPolicy": "default"
      },
      "chat-hub-route": {
        "ClusterId": "messaging-cluster",
        "Match": { "Path": "/hubs/chat/{**catch-all}" }
      }
    },
    "Clusters": {
      "identity-cluster": {
        "Destinations": {
          "identity-1": { "Address": "http://identity-api:8080/" }
        }
      },
      "feed-cluster": {
        "LoadBalancingPolicy": "RoundRobin",
        "Destinations": {
          "feed-1": { "Address": "http://feed-api-1:8080/" },
          "feed-2": { "Address": "http://feed-api-2:8080/" }
        }
      }
    }
  }
}
```

---

## 11. Load Balancer

The load balancer and the API gateway solve **different problems**:

| Layer | Tool | Purpose |
|-------|------|---------|
| **Load Balancer** | Nginx / Azure LB / AWS ALB | Distributes traffic across multiple instances of the **same** service |
| **API Gateway** | YARP | Single entry point — routes requests to the **right** service |

### Per-Service Scaling Strategy

| Service | Scale reason | LB strategy |
|---------|-------------|-------------|
| Feed.API | Most-read endpoint | Round Robin |
| Post.API | Upload spikes | Round Robin |
| Identity.API | Login bursts | Round Robin |
| Messaging.API | SignalR connections | **Sticky sessions** (same user → same instance) |
| Notification.API | Push bursts | Round Robin |

### Kubernetes Deployment (production)

In Kubernetes you don't configure load balancing manually — each service gets
a `Deployment` with a replica count and a `Service` resource that load-balances
automatically.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: post-api
spec:
  replicas: 3          # 3 instances — K8s load-balances between them
  selector:
    matchLabels:
      app: post-api
  template:
    spec:
      containers:
      - name: post-api
        image: fudo/post-api:latest
        ports:
        - containerPort: 8080
```

---

## 12. SignalR Special Case (Messaging.API)

SignalR keeps a persistent WebSocket connection. If you run multiple instances,
a user connected to instance-1 cannot receive a message sent via instance-2.

**Fix: Redis backplane** — all instances share a Redis pub/sub channel so
messages reach the right connection regardless of which pod handles the request.

```csharp
// Messaging.API/Program.cs
builder.Services
    .AddSignalR()
    .AddStackExchangeRedis(config["Redis:ConnectionString"]!);
```

Also enable sticky sessions in the gateway for the SignalR route so that the
WebSocket upgrade always goes to the same pod:

```json
"chat-hub-route": {
  "ClusterId": "messaging-cluster",
  "Match": { "Path": "/hubs/chat/{**catch-all}" },
  "Transforms": [{ "RequestHeader": "Connection", "Set": "Upgrade" }]
}
```

---

## 13. Recommended Deployment Stack

### Production

```
Cloudflare  (DNS + DDoS protection)
    ↓
Azure Application Gateway  OR  AWS ALB   (Layer 7 LB + WAF)
    ↓
Kubernetes Cluster
    ├── API Gateway pods  (YARP — 2+ replicas)
    ├── Service pods      (each 2–3 replicas minimum)
    ├── Redis cluster     (feed cache, SignalR backplane, rate-limit state)
    ├── RabbitMQ          (integration event bus)
    └── Azure SQL / SQL Server  (one database per service)
```

### Development / Early Stage

```
docker-compose
  ├── api-gateway
  ├── identity-api
  ├── user-api
  ├── post-api
  ├── feed-api
  ├── story-api
  ├── interaction-api
  ├── messaging-api
  ├── notification-api
  ├── redis
  ├── rabbitmq
  └── sqlserver
```

No Kubernetes needed in development — one instance per service on one machine.

---

## 14. Global Error Handling

One exception handler registered in each service's `Program.cs`:

```csharp
app.UseExceptionHandler(appError =>
    appError.Run(async ctx =>
    {
        var feature = ctx.Features.Get<IExceptionHandlerFeature>();
        var (status, message) = feature!.Error switch
        {
            NotFoundException     e => (404, e.Message),
            ValidationException   e => (400, e.Message),
            UnauthorizedException   => (401, "Unauthorized"),
            ForbiddenException      => (403, "Forbidden"),
            _                       => (500, "An unexpected error occurred")
        };
        ctx.Response.StatusCode = status;
        await ctx.Response.WriteAsJsonAsync(new { error = message });
    })
);
```

---

## 15. Build Order Recommendation

Build in this order to have a working app as fast as possible:

| Step | Service | Why first |
|------|---------|-----------|
| 1 | **Identity.API** | Nothing works without auth |
| 2 | **User.API** | Profiles and follows needed by everything else |
| 3 | **Post.API** | Core content of the app |
| 4 | **Interaction.API** | Likes/comments — keeps Post.API clean |
| 5 | **Feed.API** | Assemble the home feed |
| 6 | **Story.API** | Stories + 24h expiry + archive |
| 7 | **Notification.API** | Activity notifications |
| 8 | **Messaging.API** | Real-time chat (lowest priority, most complex) |

---

*Document generated for the Fudo App — Food Recipe Social Platform*
*Backend stack: ASP.NET Core 8 · EF Core · MediatR · YARP · RabbitMQ · Redis · SignalR*
