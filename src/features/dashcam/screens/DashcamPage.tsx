import { useState } from "react";
import { Camera, AlertTriangle, CheckCircle, Clock, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useDashcams,
  useDashcamAlerts,
  useAckDashcamAlert,
  type DashcamAlert,
} from "@/hooks/useDashcam";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const ALERT_LABELS: Record<string, string> = {
  fatigue:        "Fatigue",
  phone_use:      "Téléphone au volant",
  distraction:    "Distraction",
  lane_departure: "Sortie de voie",
  tailgating:     "Trop proche",
  harsh_braking:  "Freinage brusque",
  speeding:       "Excès de vitesse",
  smoking:        "Cigarette",
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-300",
  high:     "bg-orange-100 text-orange-700 border-orange-300",
  medium:   "bg-yellow-100 text-yellow-700 border-yellow-300",
  low:      "bg-green-100 text-green-700 border-green-300",
};

const SEVERITY_BADGE: Record<string, "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  high:     "destructive",
  medium:   "secondary",
  low:      "outline",
};

function AlertCard({ alert, onAck }: { alert: DashcamAlert; onAck: (id: string) => void }) {
  return (
    <div className={cn("flex gap-3 p-3 rounded-lg border", SEVERITY_COLOR[alert.severity])}>
      {alert.snapshot_url && (
        <img
          src={alert.snapshot_url}
          alt="snapshot"
          className="w-20 h-14 object-cover rounded flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={SEVERITY_BADGE[alert.severity]} className="text-xs">
            {alert.severity.toUpperCase()}
          </Badge>
          <span className="font-medium text-sm">
            {ALERT_LABELS[alert.alert_type] ?? alert.alert_type}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            {Math.round(alert.confidence * 100)}% confiance
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(alert.created_at).toLocaleString()}
          {alert.speed_kmh && ` · ${alert.speed_kmh} km/h`}
          {alert.ai_provider !== "rule-based" && ` · IA: ${alert.ai_provider}`}
        </p>
      </div>
      {!alert.acknowledged && (
        <Button size="sm" variant="ghost" className="flex-shrink-0 h-7 text-xs"
          onClick={() => onAck(alert.id)}>
          <CheckCircle className="h-3.5 w-3.5 mr-1" /> OK
        </Button>
      )}
    </div>
  );
}

export default function DashcamPage() {
  const { userFleetId } = useAuth();
  const { data: cams = [], isLoading: camsLoading } = useDashcams(userFleetId ?? undefined);
  const { data: alerts = [], isLoading: alertsLoading } = useDashcamAlerts(userFleetId ?? undefined);
  const { mutate: ack } = useAckDashcamAlert();

  const unacked = alerts.filter((a) => !a.acknowledged);
  const activeCams = cams.filter((c) => c.is_active);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Camera className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Dashcam AI</h1>
          <p className="text-sm text-muted-foreground">
            Surveillance vidéo intelligente — Hikvision, RTSP, 4G
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-primary">{activeCams.length}</p>
            <p className="text-xs text-muted-foreground">Caméras actives</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-red-600">{unacked.length}</p>
            <p className="text-xs text-muted-foreground">Alertes non acquittées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{alerts.length}</p>
            <p className="text-xs text-muted-foreground">Alertes (dernier chargement)</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts">
        <TabsList>
          <TabsTrigger value="alerts">
            Alertes
            {unacked.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs h-5">{unacked.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="cameras">Caméras ({cams.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-3 mt-4">
          {alertsLoading && [1,2,3].map(i => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
          {!alertsLoading && alerts.length === 0 && (
            <Card><CardContent className="py-10 text-center">
              <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
              <p className="text-muted-foreground">Aucune alerte — conduite irréprochable !</p>
            </CardContent></Card>
          )}
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onAck={ack} />
          ))}
        </TabsContent>

        <TabsContent value="cameras" className="space-y-3 mt-4">
          {camsLoading && [1,2].map(i => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
          {!camsLoading && cams.length === 0 && (
            <Card><CardContent className="py-10 text-center">
              <Camera className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Aucune dashcam configurée.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Contactez votre administrateur pour enregistrer vos caméras.
              </p>
            </CardContent></Card>
          )}
          {cams.map((cam) => (
            <Card key={cam.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-full", cam.is_active ? "bg-green-100" : "bg-muted")}>
                    {cam.is_active
                      ? <Wifi className="h-4 w-4 text-green-600" />
                      : <WifiOff className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{cam.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cam.brand} · Canal {cam.channel ?? 1}
                      {cam.firmware_ver && ` · FW ${cam.firmware_ver}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={cam.is_active ? "default" : "secondary"} className="text-xs">
                      {cam.is_active ? "En ligne" : "Hors ligne"}
                    </Badge>
                    {cam.last_seen_at && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" />
                        {new Date(cam.last_seen_at).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
