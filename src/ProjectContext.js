import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getProjects, getUser, getUserPermissions } from './api/services';
import { PROJECTS as MOCK_PROJECTS } from './data/mock';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [pid, setPid] = useState(0);
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [user, setUser] = useState(getUser());
  const [perms, setPerms] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProjects();
      if (data && data.length) setProjects(data);
      setUser(getUser()); // حدّث المستخدم بعد الدخول
      // اقرأ صلاحيات المستخدم الفعلية من Odoo
      try {
        const p = await getUserPermissions();
        setPerms(p);
      } catch (e) {}
    } catch (e) {
      setError(e.message || 'تعذّر تحميل المشاريع');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  return (
    <ProjectContext.Provider value={{ pid, setPid, projects, user, perms, loading, error, reloadProjects: loadProjects }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) return { pid: 0, setPid: () => {}, projects: MOCK_PROJECTS, user: null, perms: null, loading: false, error: null, reloadProjects: () => {} };
  return ctx;
}

// خطّاف مساعد للتحقق من صلاحية عملية على موديل
// مثال: const canCreate = useCan('purchase', 'create');
export function useCan(modelKey, op = 'read') {
  const { perms } = useProject();
  // إن لم تُحمّل الصلاحيات بعد، اسمح (Odoo يفرض الحقيقة عند التنفيذ)
  if (!perms || !perms[modelKey]) return true;
  return perms[modelKey][op] !== false;
}

// يرجّع معرّف المشروع الحقيقي في Odoo (أو الفهرس في وضع الوهمي)
export function useProjectId() {
  const { pid, projects } = useProject();
  const p = projects[pid];
  return { pid, realId: p && p._raw ? p._raw.id : pid, project: p };
}
