import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  InputNumber,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/error';
import {
  isRelationshipGraphAdminAnchorEnabled,
  isRelationshipGraphAdminBetaEnabled,
} from '../../features/relationship-graph/runtime';

interface RelationshipGraphEdgeAnchorRecord {
  id: string;
  status: 'PENDING' | 'ANCHORED' | 'FAILED';
  replayCount: number;
  lastError: string | null;
  anchoredAt: string | null;
  onchain: {
    required: boolean;
    enabled: boolean;
    anchored: boolean;
    anchorId: string | null;
    chainId: number | null;
    txHash: string | null;
    blockNumber: string | null;
  };
}

interface RelationshipGraphEdgeRecord {
  id: string;
  peerFrogId: number;
  score: number;
  signalCount: number;
  strength: 'LOW' | 'MEDIUM' | 'HIGH';
  firstOccurredAt: string;
  lastOccurredAt: string;
  signals: {
    journey: number;
    rescue: number;
    witness: number;
    contribution: number;
  };
  anchor: RelationshipGraphEdgeAnchorRecord | null;
}

interface RelationshipGraphSnapshotRecord {
  id: string;
  version: number;
  digest: string;
  strongestPeerFrogId: number | null;
  strongestScore: number | null;
  computedAt: string;
}

interface RelationshipGraphReadModel {
  frogId: number;
  scopeAppId: string;
  generatedAt: string;
  summary: {
    totalEdges: number;
    totalSignalCount: number;
    totalScore: number;
  };
  edges: RelationshipGraphEdgeRecord[];
  snapshot: RelationshipGraphSnapshotRecord;
  filters: {
    appId: string;
    limit: number | null;
  };
}

const FROG_ID_PATTERN = /^[1-9][0-9]*$/;
const APP_ID_PATTERN = /^[a-zA-Z0-9_:-]{2,80}$/;

const strengthColorMap: Record<RelationshipGraphEdgeRecord['strength'], string> = {
  LOW: 'default',
  MEDIUM: 'processing',
  HIGH: 'success',
};

const anchorStatusColorMap: Record<'PENDING' | 'ANCHORED' | 'FAILED', string> = {
  PENDING: 'warning',
  ANCHORED: 'success',
  FAILED: 'error',
};

const RelationshipGraphPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ appId?: string; frogId?: string }>();

  const betaEnabled = useMemo(() => isRelationshipGraphAdminBetaEnabled(), []);
  const anchorViewEnabled = useMemo(() => isRelationshipGraphAdminAnchorEnabled(), []);
  const [appIdInput, setAppIdInput] = useState(params.appId || '');
  const [frogIdInput, setFrogIdInput] = useState(params.frogId || '');
  const [limitInput, setLimitInput] = useState<number>(20);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [graph, setGraph] = useState<RelationshipGraphReadModel | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const selectedEdge = useMemo(() => {
    if (!graph) {
      return null;
    }
    if (!selectedEdgeId) {
      return graph.edges[0] || null;
    }
    return graph.edges.find((item) => item.id === selectedEdgeId) || graph.edges[0] || null;
  }, [graph, selectedEdgeId]);

  const loadGraph = useCallback(
    async (nextAppId: string, nextFrogId: string) => {
      if (!APP_ID_PATTERN.test(nextAppId)) {
        setRequestError('appId 格式不合法，必须匹配 [a-zA-Z0-9_:-]{2,80}');
        return;
      }
      if (!FROG_ID_PATTERN.test(nextFrogId)) {
        setRequestError('frogId 必须是正整数');
        return;
      }

      setLoadingGraph(true);
      setRequestError(null);
      try {
        const query = new URLSearchParams();
        query.set('appId', nextAppId);
        if (Number.isInteger(limitInput) && limitInput > 0) {
          query.set('limit', String(Math.min(limitInput, 100)));
        }

        const payload = (await api.get(
          `/api/admin/v3/relationship-graph/frogs/${encodeURIComponent(nextFrogId)}?${query.toString()}`
        )) as RelationshipGraphReadModel;

        setGraph(payload);
        setSelectedEdgeId(payload.edges[0]?.id || null);
        navigate(`/relationship-graph/${encodeURIComponent(nextAppId)}/${nextFrogId}`, {
          replace: true,
        });
      } catch (error) {
        setGraph(null);
        setSelectedEdgeId(null);
        setRequestError(getApiErrorMessage(error, '加载 Relationship Graph 失败'));
      } finally {
        setLoadingGraph(false);
      }
    },
    [limitInput, navigate]
  );

  useEffect(() => {
    if (params.appId) {
      setAppIdInput(params.appId);
    }
    if (params.frogId) {
      setFrogIdInput(params.frogId);
    }
  }, [params.appId, params.frogId]);

  useEffect(() => {
    if (!betaEnabled || !params.appId || !params.frogId) {
      return;
    }
    if (!APP_ID_PATTERN.test(params.appId) || !FROG_ID_PATTERN.test(params.frogId)) {
      return;
    }
    if (graph && graph.scopeAppId === params.appId && graph.frogId === Number(params.frogId)) {
      return;
    }
    void loadGraph(params.appId, params.frogId);
  }, [betaEnabled, graph, loadGraph, params.appId, params.frogId]);

  const columns: ColumnsType<RelationshipGraphEdgeRecord> = useMemo(() => {
    const baseColumns: ColumnsType<RelationshipGraphEdgeRecord> = [
      {
        title: 'Peer Frog',
        dataIndex: 'peerFrogId',
        key: 'peerFrogId',
        width: 120,
      },
      {
        title: 'Strength',
        dataIndex: 'strength',
        key: 'strength',
        width: 120,
        render: (value: RelationshipGraphEdgeRecord['strength']) => (
          <Tag color={strengthColorMap[value]}>{value}</Tag>
        ),
      },
      {
        title: 'Score',
        dataIndex: 'score',
        key: 'score',
        width: 100,
      },
      {
        title: 'Signals',
        dataIndex: 'signalCount',
        key: 'signalCount',
        width: 100,
      },
    ];

    if (anchorViewEnabled) {
      baseColumns.push({
        title: 'Anchor',
        dataIndex: 'anchor',
        key: 'anchor',
        width: 140,
        render: (anchor: RelationshipGraphEdgeAnchorRecord | null) =>
          anchor ? (
            <Tag color={anchorStatusColorMap[anchor.status]}>{anchor.status}</Tag>
          ) : (
            <Typography.Text type="secondary">NOT_ANCHORED</Typography.Text>
          ),
      });
    }

    baseColumns.push({
      title: 'Last Occurred',
      dataIndex: 'lastOccurredAt',
      key: 'lastOccurredAt',
      render: (value: string) => new Date(value).toLocaleString(),
    });

    return baseColumns;
  }, [anchorViewEnabled]);

  if (!betaEnabled) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Relationship Graph Admin 观测入口已关闭"
        description="当前 beta gate 为关闭状态。若需启用，请打开 VITE_V3_RELATIONSHIP_GRAPH_ADMIN_ENABLED。"
      />
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title="Relationship Graph 观测入口（只读）"
        extra={
          <Button
            icon={<ReloadOutlined />}
            loading={loadingGraph}
            onClick={() => {
              void loadGraph(appIdInput.trim(), frogIdInput.trim());
            }}
          >
            刷新
          </Button>
        }
      >
        <Typography.Paragraph type="secondary">
          该页面仅做只读观测，不提供写操作。通过 appId + frogId 查询单个关系图快照，默认 fail-closed。
        </Typography.Paragraph>

        {requestError ? (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            message="Relationship Graph 加载失败"
            description={requestError}
          />
        ) : null}

        <Space wrap>
          <Input
            value={appIdInput}
            onChange={(event) => setAppIdInput(event.target.value)}
            placeholder="appId, e.g. int_rel_main"
            style={{ width: 260 }}
          />
          <Input
            value={frogIdInput}
            onChange={(event) => setFrogIdInput(event.target.value)}
            placeholder="frogId, e.g. 901"
            style={{ width: 180 }}
          />
          <InputNumber
            value={limitInput}
            min={1}
            max={100}
            onChange={(value) => setLimitInput(typeof value === 'number' ? value : 20)}
            style={{ width: 140 }}
          />
          <Button
            type="primary"
            loading={loadingGraph}
            onClick={() => {
              void loadGraph(appIdInput.trim(), frogIdInput.trim());
            }}
          >
            加载图谱
          </Button>
        </Space>
      </Card>

      {graph ? (
        <>
          <Card title="Graph 卡片">
            <Descriptions column={3} bordered size="small">
              <Descriptions.Item label="Scope App">{graph.scopeAppId}</Descriptions.Item>
              <Descriptions.Item label="Root Frog">{graph.frogId}</Descriptions.Item>
              <Descriptions.Item label="Generated At">
                {new Date(graph.generatedAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Total Edges">{graph.summary.totalEdges}</Descriptions.Item>
              <Descriptions.Item label="Total Signals">{graph.summary.totalSignalCount}</Descriptions.Item>
              <Descriptions.Item label="Total Score">{graph.summary.totalScore}</Descriptions.Item>
              <Descriptions.Item label="Snapshot Digest" span={3}>
                <Typography.Text code>{graph.snapshot.digest}</Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="Strongest Peer">
                {graph.snapshot.strongestPeerFrogId || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Strongest Score">
                {graph.snapshot.strongestScore ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Snapshot Version">{graph.snapshot.version}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="Edge 列表（只读）">
            <Table<RelationshipGraphEdgeRecord>
              rowKey="id"
              columns={columns}
              dataSource={graph.edges}
              loading={loadingGraph}
              pagination={false}
              onRow={(record) => ({
                onClick: () => {
                  setSelectedEdgeId(record.id);
                },
              })}
              rowClassName={(record) =>
                selectedEdge?.id === record.id ? 'ant-table-row-selected' : ''
              }
              locale={{
                emptyText: <Empty description="暂无 edge 数据" />,
              }}
            />
          </Card>

          <Card title="详情只读页">
            {selectedEdge ? (
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Edge ID" span={2}>
                  <Typography.Text code>{selectedEdge.id}</Typography.Text>
                </Descriptions.Item>
                <Descriptions.Item label="Peer Frog">{selectedEdge.peerFrogId}</Descriptions.Item>
                <Descriptions.Item label="Strength">
                  <Tag color={strengthColorMap[selectedEdge.strength]}>{selectedEdge.strength}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Score">{selectedEdge.score}</Descriptions.Item>
                <Descriptions.Item label="Signals">{selectedEdge.signalCount}</Descriptions.Item>
                <Descriptions.Item label="Journey / Rescue / Witness / Contribution" span={2}>
                  {selectedEdge.signals.journey} / {selectedEdge.signals.rescue} /{' '}
                  {selectedEdge.signals.witness} / {selectedEdge.signals.contribution}
                </Descriptions.Item>
                <Descriptions.Item label="First Occurred">
                  {new Date(selectedEdge.firstOccurredAt).toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="Last Occurred">
                  {new Date(selectedEdge.lastOccurredAt).toLocaleString()}
                </Descriptions.Item>
                {anchorViewEnabled ? (
                  <Descriptions.Item label="Anchor Status" span={2}>
                    {selectedEdge.anchor ? (
                      <Tag color={anchorStatusColorMap[selectedEdge.anchor.status]}>
                        {selectedEdge.anchor.status}
                      </Tag>
                    ) : (
                      <Typography.Text type="secondary">NOT_ANCHORED</Typography.Text>
                    )}
                  </Descriptions.Item>
                ) : null}
                {anchorViewEnabled && selectedEdge.anchor ? (
                  <Descriptions.Item label="Anchor TX / Chain" span={2}>
                    {selectedEdge.anchor.onchain.txHash || '-'} /{' '}
                    {selectedEdge.anchor.onchain.chainId || '-'}
                  </Descriptions.Item>
                ) : null}
              </Descriptions>
            ) : (
              <Empty description="请先从上方 edge 列表选择一条关系边" />
            )}
          </Card>
        </>
      ) : null}
    </Space>
  );
};

export default RelationshipGraphPage;
