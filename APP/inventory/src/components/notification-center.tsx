import { useQueryClient } from "@tanstack/react-query";
import {
    getListNotificationsQueryKey,
    useListNotifications,
    useMarkAllNotificationsRead,
    useMarkNotificationsRead,
    type Notification,
} from "@workspace/api-client-react";
import { Bell, BellDot, CheckCheck, CircleAlert, RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

const REFRESH_INTERVAL_MS = 30_000;

function formatRelativeTime(value: string) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) {
    return "just now";
  }

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationCenter() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const {
    data: notifications,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useListNotifications({ limit: 50 });

  const markRead = useMarkNotificationsRead();
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refetch();
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [refetch]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void refetch();
  }, [open, refetch]);

  const items = notifications ?? [];
  const unreadCount = items.reduce((count, item) => count + (item.isRead ? 0 : 1), 0);

  const markAllAsRead = () => {
    if (unreadCount === 0) {
      return;
    }
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      },
    });
  };

  const openNotification = (item: Notification) => {
    if (!item.isRead) {
      markRead.mutate(
        { data: { notificationIds: [item.id] } },
        {
          onSettled: () => {
            queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
          },
        },
      );
    }

    setOpen(false);
    setLocation(`/products/${item.productId}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          {unreadCount > 0 ? <BellDot className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] leading-none flex items-center justify-center font-semibold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between p-3">
          <div>
            <p className="font-semibold text-sm">Notifications</p>
            <p className="text-xs text-muted-foreground">Stock health alerts</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                void refetch();
              }}
              title="Refresh notifications"
              aria-label="Refresh notifications"
            >
              {isFetching ? <Spinner className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={markAllAsRead}
              title="Mark all as read"
              aria-label="Mark all as read"
              disabled={unreadCount === 0 || markAllRead.isPending}
            >
              <CheckCheck className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <Separator />

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Spinner className="w-5 h-5" />
          </div>
        ) : isError ? (
          <div className="h-64 px-4 flex flex-col items-center justify-center gap-3 text-center">
            <CircleAlert className="w-5 h-5 text-destructive" />
            <p className="text-sm font-medium">Could not load notifications</p>
            <p className="text-xs text-muted-foreground max-w-[240px]">
              {error instanceof Error ? error.message : "Please try again."}
            </p>
            <Button variant="outline" size="sm" onClick={() => {
              void refetch();
            }}>
              Retry
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="h-64 px-4 flex flex-col items-center justify-center gap-2 text-center">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <p className="text-sm font-medium">All good</p>
            <p className="text-xs text-muted-foreground">No low-stock or out-of-stock alerts right now.</p>
          </div>
        ) : (
          <ScrollArea className="h-80">
            <div className="p-2 space-y-1">
              {items.map((item) => {
                const isRead = item.isRead;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openNotification(item)}
                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                      isRead
                        ? "bg-background border-border/50 hover:bg-muted/30"
                        : "bg-muted/40 border-border hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 min-w-0">
                        {item.severity === "critical" ? (
                          <CircleAlert className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                        ) : (
                          <TriangleAlert className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.message}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant="outline"
                          className={item.severity === "critical" ? "text-destructive border-destructive/30" : "text-amber-600 border-amber-500/40"}
                        >
                          {item.severity === "critical" ? "Critical" : "Warning"}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatRelativeTime(item.updatedAt)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
