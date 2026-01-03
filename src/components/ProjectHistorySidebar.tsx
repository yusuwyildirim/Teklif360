import { ProjectHistory } from "@/types/projectHistory.types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, FileText, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface ProjectHistorySidebarProps {
  projects: ProjectHistory[];
  onSelectProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  selectedProjectId?: string;
}

export const ProjectHistorySidebar = ({
  projects,
  onSelectProject,
  onDeleteProject,
  selectedProjectId,
}: ProjectHistorySidebarProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleDeleteClick = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(projectId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (projectToDelete) {
      onDeleteProject(projectToDelete);
    }
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Bugün " + date.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Dün";
    } else if (diffDays < 7) {
      return `${diffDays} gün önce`;
    } else {
      return date.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "short",
      });
    }
  };

  return (
    <>
      <div className={`border-r border-border bg-muted/30 flex flex-col h-screen transition-all duration-300 relative ${
        isCollapsed ? 'w-12' : 'w-64'
      }`}>
        {/* Collapse/Expand Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full border border-border bg-background p-0 shadow-md hover:bg-accent"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>

        {!isCollapsed && (
          <>
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">İşlem Geçmişi</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {projects.length} kayıtlı işlem
              </p>
            </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {projects.length === 0 ? (
              <div className="text-center py-8 px-4">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Henüz kayıtlı işlem yok
                </p>
              </div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className={`
                    group relative p-3 rounded-lg cursor-pointer transition-all
                    hover:bg-primary/5 border border-transparent
                    ${
                      selectedProjectId === project.id
                        ? "bg-primary/10 border-primary/30 hover:bg-primary/10"
                        : "hover:border-border"
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-medium truncate ${
                        selectedProjectId === project.id ? "text-primary" : "text-foreground"
                      }`}>
                        {project.name}
                      </h3>
                      <div className={`flex items-center gap-1 mt-1 text-xs ${
                        selectedProjectId === project.id ? "text-primary/80" : "text-muted-foreground"
                      }`}>
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(project.createdAt || project.date)}</span>
                      </div>
                      <div className={`flex items-center gap-3 mt-1.5 text-xs ${
                        selectedProjectId === project.id ? "text-primary/70" : "text-muted-foreground"
                      }`}>
                        <span>{project.itemCount} kalem</span>
                        <div className="flex items-center gap-1">
                          <span>
                            {project.totalAmount.toLocaleString("tr-TR", {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                          <span className="font-medium">TL</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDeleteClick(project.id, e)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
          </>
        )}

        {/* Collapsed State - Show icon only */}
        {isCollapsed && (
          <div className="flex-1 flex items-start justify-center pt-4">
            <FileText className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>İşlemi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlemi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
